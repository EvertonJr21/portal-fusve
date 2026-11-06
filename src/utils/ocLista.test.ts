import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { HistOC, OC, Solicitacao } from '@/types'
import { avaliarOC } from './kpis'
import {
  agruparPorFornecedor,
  contarVisoes,
  FILTROS_VAZIOS,
  filtrarLinhas,
  montarLinhas,
  naVisao,
  ordenarLinhas,
  SEM_MOTIVO,
  textoPrazo,
  visaoDeParametro,
} from './ocLista'

const HOJE = new Date(2026, 10, 6) // 06/11/2026
const SEM_CONTRATO = new Map<number, number>()

// A prioridade (prioridade.ts) e os dias sem movimentação leem getHoje() — relógio fixo no mesmo dia de HOJE.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 6, 12))
})
afterAll(() => {
  vi.useRealTimers()
})

function oc(p: Partial<OC> = {}): OC {
  return {
    id: 80000,
    dataSolic: '01/11/2026',
    fornecedorNome: 'FORNECEDOR TESTE',
    fornecedorId: 1,
    sit: 'Autorizada',
    estoque: 'SUP CAF',
    solicitacaoId: null,
    cobrado: false,
    previsaoForn: '20/11/2026',
    previsaoForn2: null,
    dataEntregaReal: null,
    dataParcial: null,
    dataEntregaOrigem: null,
    entradaMv: '',
    qtdEntradas: 0,
    diasAtraso: 0,
    hospitalId: 'huv',
    proximaAcao: null,
    motivoAtraso: null,
    ultimaMovimentacao: '05/11/2026',
    previsaoDescumprida: false,
    ...p,
  }
}

function linhas(ocs: OC[], sols: Solicitacao[] = [], ultimas = new Map<number, HistOC>(), prazos = SEM_CONTRATO) {
  return montarLinhas(
    ocs.map((o) => avaliarOC(o, prazos, 15, HOJE)),
    sols,
    ultimas,
    HOJE,
  )
}

describe('montarLinhas — prazo igual ao do Desempenho de Entrega', () => {
  it('usa data da OC + prazo padrão, não solicitação + 15', () => {
    // Solicitação bem antiga (pelo institucional estaria vencida), OC recente.
    const sols: Solicitacao[] = [
      { id: 500, data: '01/09/2026', produto: 'LUVA', motivo: '', solicitante: '', qtd: 1, sit: 'Aberta', hospitalId: 'huv' } as Solicitacao,
    ]
    const [l] = linhas([oc({ solicitacaoId: 500 })], sols)
    expect(l.diasPrazo).toBe(10) // 01/11 + 15 = 16/11 → 10 dias a partir de 06/11
    expect(l.statusPrazo).toBe('ok')
    expect(l.prazoInstitucional).toEqual(new Date(2026, 8, 16))
    expect(l.sol?.produto).toBe('LUVA')
  })

  it('prazo do contrato encurta a data prometida', () => {
    const [l] = linhas([oc()], [], new Map(), new Map([[1, 3]]))
    expect(l.diasPrazo).toBe(-2) // 01/11 + 3 = 04/11
    expect(l.statusPrazo).toBe('vencida')
    expect(textoPrazo(l)).toBe('Venc. 2d')
    expect(l.prioridade).toBe('critica')
  })

  it('urgente até 3 dias antes; fechada não tem prazo nem prioridade', () => {
    const [urgente, entregue, cancelada] = linhas([
      oc({ id: 1, dataSolic: '24/10/2026' }), // vence 08/11
      oc({ id: 2, sit: 'Atendida', dataEntregaReal: '05/11/2026' }),
      oc({ id: 3, sit: 'Cancelada' }),
    ])
    expect(urgente.statusPrazo).toBe('urgente')
    expect(textoPrazo(urgente)).toBe('2d rest.')
    expect(entregue.statusPrazo).toBe('entregue')
    expect(entregue.prioridade).toBeNull()
    expect(cancelada.statusPrazo).toBe('cancelada')
  })

  it('cobrança sem resposta conta como pendente; só OC aberta carrega a cobrança', () => {
    const cob: HistOC = { hid: 1, ocId: 1, ts: new Date(2026, 10, 1).getTime(), canal: 'mail', resposta: '', tipo: 'individual', respondidoEm: null }
    const [aberta, fechada] = linhas(
      [oc({ id: 1 }), oc({ id: 2, sit: 'Atendida', dataEntregaReal: '05/11/2026' })],
      [],
      new Map([
        [1, cob],
        [2, { ...cob, ocId: 2 }],
      ]),
    )
    expect(aberta.cobrancaPendente).toBe(true)
    expect(aberta.prioridade).toBe('critica') // 5 dias sem resposta
    expect(fechada.ultimaCobranca).toBeNull()
  })
})

describe('visões', () => {
  const ls = linhas([
    oc({ id: 1, previsaoForn: null }), // aberta, sem previsão → alta
    oc({ id: 2, dataSolic: '01/10/2026' }), // vencida → crítica
    oc({ id: 3, sit: 'Parcialmente Atendida' }),
    oc({ id: 4, sit: 'Atendida', dataEntregaReal: '05/11/2026', dataEntregaOrigem: 'estimada' }),
    oc({ id: 5, sit: 'Atendida', dataEntregaReal: '05/11/2026', dataEntregaOrigem: 'mv' }),
    oc({ id: 6 }), // aberta, normal
  ])
  const ids = (v: Parameters<typeof naVisao>[1]) => ls.filter((l) => naVisao(l, v)).map((l) => l.oc.id)

  it('cada visão pega o conjunto certo', () => {
    expect(ids('acao')).toEqual([1, 2])
    expect(ids('vencidas')).toEqual([2])
    expect(ids('sem_previsao')).toEqual([1])
    expect(ids('parciais')).toEqual([3])
    expect(ids('a_confirmar')).toEqual([4])
    expect(ids('abertas')).toEqual([1, 2, 3, 6])
    expect(contarVisoes(ls).todas).toBe(6)
  })

  it('ordem por prioridade: crítica, depois alta, depois o resto', () => {
    expect(ordenarLinhas(ls.filter((l) => l.aberta), 'prioridade', 1).map((l) => l.oc.id).slice(0, 2)).toEqual([2, 1])
  })

  it('link antigo ?rapido= cai na visão equivalente', () => {
    expect(visaoDeParametro('vencidas', null)).toBe('vencidas')
    expect(visaoDeParametro('previsao_descumprida', null)).toBe('acao')
    expect(visaoDeParametro(null, 'parciais')).toBe('parciais')
    expect(visaoDeParametro(null, 'xyz')).toBeNull()
  })
})

describe('filtrarLinhas', () => {
  const sols = [{ id: 700, data: '01/11/2026', produto: 'SERINGA 10ML', motivo: '', solicitante: '', qtd: 1, sit: 'Aberta', hospitalId: 'huv' } as Solicitacao]
  const ls = linhas(
    [
      oc({ id: 81001, fornecedorNome: 'ALFA MÉDICA', solicitacaoId: 700, motivoAtraso: 'Falta de produto' }),
      oc({ id: 81002, fornecedorNome: 'BETA', dataSolic: '15/10/2026' }),
    ],
    sols,
  )
  const ids = (f: Partial<typeof FILTROS_VAZIOS>) => filtrarLinhas(ls, { ...FILTROS_VAZIOS, ...f }).map((l) => l.oc.id)

  it('busca por produto da solicitação, ignorando acento e ordem das palavras', () => {
    expect(ids({ busca: '10ml seringa' })).toEqual([81001])
    expect(ids({ busca: 'alfa medica' })).toEqual([81001])
    expect(ids({ busca: '700' })).toEqual([81001])
  })

  it('motivo, vínculo e período', () => {
    expect(ids({ motivo: 'Falta de produto' })).toEqual([81001])
    expect(ids({ motivo: SEM_MOTIVO })).toEqual([81002])
    expect(ids({ vinculo: 'sem' })).toEqual([81002])
    expect(ids({ de: '2026-10-20' })).toEqual([81001])
    expect(ids({ previsao: '2026-11-20' })).toEqual([81001, 81002])
  })
})

describe('agruparPorFornecedor', () => {
  it('fornecedor com OC vencida vem primeiro', () => {
    const ls = linhas([
      oc({ id: 1, fornecedorId: 1, fornecedorNome: 'A' }),
      oc({ id: 2, fornecedorId: 1, fornecedorNome: 'A' }),
      oc({ id: 3, fornecedorId: 2, fornecedorNome: 'B', dataSolic: '01/10/2026' }),
    ])
    const g = agruparPorFornecedor(ls)
    expect(g.map((x) => [x.fornecedorNome, x.linhas.length, x.vencidas])).toEqual([
      ['B', 1, 1],
      ['A', 2, 0],
    ])
  })
})
