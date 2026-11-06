import { describe, expect, it } from 'vitest'
import type { ContratoHeader, Fornecedor, OC } from '@/types'
import {
  avaliarOC,
  backlogVencido,
  cicloInterno,
  classificar,
  confiabilidadePrevisao,
  desempenhoPorFornecedor,
  percentil,
  prazosContratuais,
  resumir,
} from './kpis'

const HOJE = new Date(2026, 10, 6) // 06/11/2026
const SEM_CONTRATO = new Map<number, number>()

function oc(p: Partial<OC> = {}): OC {
  return {
    id: 80000,
    dataSolic: '01/10/2026',
    fornecedorNome: 'FORNECEDOR TESTE',
    fornecedorId: 1,
    sit: 'Atendida',
    estoque: 'SUP CAF',
    solicitacaoId: null,
    cobrado: false,
    previsaoForn: null,
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
    ultimaMovimentacao: null,
    previsaoDescumprida: false,
    ...p,
  }
}

describe('avaliarOC', () => {
  it('entrega até a data prometida (OC + 15) = no prazo; lead time em dias corridos', () => {
    const a = avaliarOC(oc({ dataEntregaReal: '16/10/2026', dataEntregaOrigem: 'mv', qtdEntradas: 1 }), SEM_CONTRATO, 15, HOJE)
    expect(a.status).toBe('no_prazo')
    expect(a.leadTimeDias).toBe(15)
    expect(a.inFull).toBe(true)
    expect(a.confirmada).toBe(true)
  })

  it('1 dia depois da prometida = atrasada, com o atraso contado', () => {
    const a = avaliarOC(oc({ dataEntregaReal: '17/10/2026' }), SEM_CONTRATO, 15, HOJE)
    expect(a.status).toBe('atrasada')
    expect(a.diasAtraso).toBe(1)
    expect(a.confirmada).toBe(false)
  })

  it('usa o prazo do contrato quando existe', () => {
    const a = avaliarOC(oc({ dataEntregaReal: '10/10/2026' }), new Map([[1, 5]]), 15, HOJE)
    expect(a.prazoFonte).toBe('contrato')
    expect(a.status).toBe('atrasada')
    expect(a.diasAtraso).toBe(4)
  })

  it('passou por parcial ou teve mais de uma entrada = não In Full', () => {
    expect(avaliarOC(oc({ dataEntregaReal: '05/10/2026', dataParcial: '03/10/2026' }), SEM_CONTRATO, 15, HOJE).inFull).toBe(false)
    expect(avaliarOC(oc({ dataEntregaReal: '05/10/2026', qtdEntradas: 2 }), SEM_CONTRATO, 15, HOJE).inFull).toBe(false)
  })

  it('aberta depois da prometida = aberta vencida (falha); antes = fora do cálculo', () => {
    const vencida = avaliarOC(oc({ sit: 'Autorizada' }), SEM_CONTRATO, 15, HOJE)
    expect(vencida.status).toBe('aberta_vencida')
    expect(vencida.diasAtraso).toBe(21)
    expect(avaliarOC(oc({ sit: 'Autorizada', dataSolic: '01/11/2026' }), SEM_CONTRATO, 15, HOJE).status).toBe('aberta_no_prazo')
  })

  it('parcial continua aberta mesmo com data de entrega preenchida', () => {
    const a = avaliarOC(oc({ sit: 'Parcialmente Atendida', dataEntregaReal: '05/10/2026' }), SEM_CONTRATO, 15, HOJE)
    expect(a.status).toBe('aberta_vencida')
  })

  it('cancelada fica fora; concluída sem data, com data futura ou anterior à OC = sem_data', () => {
    expect(avaliarOC(oc({ sit: 'Cancelada' }), SEM_CONTRATO, 15, HOJE).status).toBe('cancelada')
    expect(avaliarOC(oc(), SEM_CONTRATO, 15, HOJE).status).toBe('sem_data')
    expect(avaliarOC(oc({ dataEntregaReal: '20/11/2026' }), SEM_CONTRATO, 15, HOJE).status).toBe('sem_data')
    expect(avaliarOC(oc({ dataEntregaReal: '20/09/2026' }), SEM_CONTRATO, 15, HOJE).status).toBe('sem_data')
  })
})

describe('resumir', () => {
  // 4 entregues (3 no prazo, 2 desses completos), 1 aberta vencida, 1 concluída sem data, 1 cancelada.
  const avaliacoes = [
    oc({ dataEntregaReal: '05/10/2026', qtdEntradas: 1, dataEntregaOrigem: 'mv' }),
    oc({ dataEntregaReal: '11/10/2026', dataEntregaOrigem: 'manual' }),
    oc({ dataEntregaReal: '16/10/2026', dataParcial: '10/10/2026' }),
    oc({ dataEntregaReal: '31/10/2026' }),
    oc({ sit: 'Autorizada' }),
    oc(),
    oc({ sit: 'Cancelada' }),
  ].map((o) => avaliarOC(o, SEM_CONTRATO, 15, HOJE))
  const r = resumir(avaliacoes)

  it('OTIF = perfeitas ÷ (entregues + abertas vencidas)', () => {
    expect(r.avaliadas).toBe(5)
    expect(r.perfeitas).toBe(2)
    expect(r.otif).toBeCloseTo(2 / 5)
    expect(r.onTime).toBeCloseTo(3 / 5)
    expect(r.inFull).toBeCloseTo(3 / 4)
  })

  it('lead time em mediana e P90 (dias: 4, 10, 15, 30)', () => {
    expect(r.leadTimeMediana).toBe(12.5)
    expect(r.leadTimeP90).toBeCloseTo(25.5)
  })

  it('cobertura de dados sobre as concluídas', () => {
    expect(r.concluidas).toBe(5)
    expect(r.semData).toBe(1)
    expect(r.cobertura).toBeCloseTo(4 / 5)
    expect(r.coberturaConfirmada).toBeCloseTo(2 / 5)
  })
})

describe('classificar', () => {
  const base = resumir([])
  it('sem nota abaixo de 5 OCs avaliadas', () => {
    expect(classificar({ ...base, avaliadas: 4, otif: 1 })).toBeNull()
  })
  it('faixas A ≥ 90, B ≥ 75, C ≥ 60, D abaixo', () => {
    expect(classificar({ ...base, avaliadas: 5, otif: 0.9 })?.classe).toBe('A')
    expect(classificar({ ...base, avaliadas: 5, otif: 0.75 })?.classe).toBe('B')
    expect(classificar({ ...base, avaliadas: 5, otif: 0.6 })?.classe).toBe('C')
    expect(classificar({ ...base, avaliadas: 5, otif: 0.59 })?.classe).toBe('D')
  })
})

describe('prazosContratuais', () => {
  const forns: Fornecedor[] = [
    { id: 10, nome: 'ALFA LTDA', email: '', wpp: '', cnpj: '11.222.333/0001-44' },
    { id: 20, nome: 'BETA', email: '', wpp: '' },
  ]
  const contrato = (p: Partial<ContratoHeader>) => ({ status: 'Ativo', prazoMedioDias: 5, fornecedorCnpj: '', fornecedorNome: '', ...p }) as ContratoHeader
  it('casa por CNPJ, depois por nome; ignora inativo e sem prazo; menor prazo vence', () => {
    const m = prazosContratuais(
      [
        contrato({ fornecedorCnpj: '11222333000144', prazoMedioDias: 7 }),
        contrato({ fornecedorCnpj: '11.222.333/0001-44', prazoMedioDias: 3 }),
        contrato({ fornecedorNome: 'Beta', prazoMedioDias: 10 }),
        contrato({ fornecedorNome: 'BETA', status: 'Inativo', prazoMedioDias: 1 }),
        contrato({ fornecedorNome: 'BETA', prazoMedioDias: null }),
      ],
      forns,
    )
    expect(m.get(10)).toBe(3)
    expect(m.get(20)).toBe(10)
  })
})

describe('outros indicadores', () => {
  it('backlog vencido por faixa', () => {
    const faixas = backlogVencido(
      ['30/10/2026', '20/10/2026', '01/10/2026', '01/08/2026'].map((d) => avaliarOC(oc({ sit: 'Autorizada', dataSolic: d }), SEM_CONTRATO, 0, HOJE)),
    )
    expect(faixas.map((f) => f.quantidade)).toEqual([1, 0, 1, 2]) // 7, 17, 36 e 97 dias
  })

  it('confiabilidade da previsão compara entrega com a previsão registrada', () => {
    const c = confiabilidadePrevisao([
      avaliarOC(oc({ dataEntregaReal: '10/10/2026', previsaoForn: '12/10/2026' }), SEM_CONTRATO, 15, HOJE),
      avaliarOC(oc({ dataEntregaReal: '14/10/2026', previsaoForn: '12/10/2026' }), SEM_CONTRATO, 15, HOJE),
      avaliarOC(oc({ dataEntregaReal: '14/10/2026' }), SEM_CONTRATO, 15, HOJE),
    ])
    expect(c).toEqual({ total: 2, cumpridas: 1, pct: 0.5 })
  })

  it('ciclo interno Solicitação → OC, contra a meta', () => {
    const sols = [{ id: 1, data: '28/09/2026', produto: '', motivo: '', solicitante: '', qtd: 1, sit: 'Aberta', hospitalId: 'huv' as const }]
    const c = cicloInterno([oc({ solicitacaoId: 1 }), oc({ solicitacaoId: 1, dataSolic: '05/10/2026' }), oc({ solicitacaoId: 99 })], sols, 3)
    expect(c.total).toBe(2)
    expect(c.dentroMeta).toBe(1)
    expect(c.mediana).toBe(5)
  })

  it('desempenho por fornecedor separa por fornecedorId e ignora canceladas', () => {
    const lista = desempenhoPorFornecedor(
      [oc({ fornecedorId: 1, dataEntregaReal: '05/10/2026' }), oc({ fornecedorId: 2, sit: 'Cancelada' })].map((o) =>
        avaliarOC(o, SEM_CONTRATO, 15, HOJE),
      ),
      [],
    )
    expect(lista.map((d) => [d.fornecedorId, d.totalOCs])).toEqual([[1, 1]])
  })

  it('percentil com interpolação', () => {
    expect(percentil([], 0.5)).toBeNull()
    expect(percentil([1, 2, 3, 4], 0.5)).toBe(2.5)
  })
})
