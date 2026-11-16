import { describe, expect, it } from 'vitest'
import type { ContratoHeader, Fornecedor } from '@/types'
import { cabecalhoRenovacao } from '@/repositories/contratoRepository'
import { iniciais } from './usuario'
import { dataHora, descreverAlteracao } from './historico'
import { ligarContratosFornecedores } from './kpis'
import {
  acharPaciente,
  construirSemana,
  copiarDadosPaciente,
  diasAteCirurgia,
  mensagemConfirmacaoOpme,
  pacientesDeOpmes,
  rotuloPrazoCirurgia,
  usoFornecedoresEmOpme,
} from './opme'
import { contadoresModulos } from './resumoDia'

// Dados fictícios — nenhum fornecedor/contrato real.
function contrato(over: Partial<ContratoHeader> = {}): ContratoHeader {
  return {
    id: 'c1', titulo: 'Acordo teste', tipo: 'Contrato', status: 'Ativo',
    fornecedorNome: 'Fornecedor Exemplo Ltda', fornecedorCnpj: '11.111.111/0001-11',
    contatoNome: '', contatoEmail: '', contatoWhatsapp: '', freteTipo: '', prazoMedioDias: 10,
    origemEmbarque: '', toleranciaAtrasoDias: null, horarioCutoff: '', gatilhoDesconto: '', reajusteRegra: '',
    condicaoPagamento: '', vigenciaInicio: '2026-01-01', vigenciaFim: '2026-12-31', avisoRenovacaoDias: 90,
    renovacaoAutomatica: false, hospitalId: 'huv', classificacao: '', observacoes: '',
    pdfPath: 'x/y.pdf', pdfNome: 'y.pdf', ...over,
  }
}
const forn = (id: number, nome: string, cnpj: string | null = null): Fornecedor => ({ id, nome, email: '', wpp: '', cnpj })

describe('cabecalhoRenovacao', () => {
  it('começa no dia seguinte ao fim, com a mesma duração, em negociação e sem PDF', () => {
    const n = cabecalhoRenovacao(contrato(), 'novo')
    expect(n.id).toBe('novo')
    expect(n.vigenciaInicio).toBe('2027-01-01')
    expect(n.vigenciaFim).toBe('2027-12-31')
    expect(n.status).toBe('Em Negociação')
    expect(n.pdfPath).toBeNull()
    expect(n.titulo).toBe('Acordo teste')
  })
  it('sem início usa 1 ano; sem fim deixa a vigência vazia', () => {
    expect(cabecalhoRenovacao(contrato({ vigenciaInicio: null }), 'n').vigenciaFim).toBe('2027-12-31')
    const semFim = cabecalhoRenovacao(contrato({ vigenciaFim: null }), 'n')
    expect(semFim.vigenciaInicio).toBeNull()
    expect(semFim.vigenciaFim).toBeNull()
  })
})

describe('ligarContratosFornecedores', () => {
  it('casa por CNPJ e, sem CNPJ, pelo nome normalizado', () => {
    const forns = [forn(1, 'OUTRO NOME', '11111111000111'), forn(2, 'Distribuidora Ábaco')]
    const { porFornecedor, fornecedorDoContrato } = ligarContratosFornecedores(
      [contrato(), contrato({ id: 'c2', fornecedorCnpj: '', fornecedorNome: 'distribuidora abaco' }), contrato({ id: 'c3', fornecedorCnpj: '', fornecedorNome: 'Ninguém' })],
      forns,
    )
    expect(fornecedorDoContrato.get('c1')).toBe(1)
    expect(fornecedorDoContrato.get('c2')).toBe(2)
    expect(fornecedorDoContrato.has('c3')).toBe(false)
    expect(porFornecedor.get(1)?.map((c) => c.id)).toEqual(['c1'])
  })
})

describe('histórico de alterações', () => {
  const alt = (campo: string, de: string | null, para: string | null) => ({ id: 1, campo, de, para, userEmail: 'a@b', em: '' })
  it('descreve datas, exclusão e preço', () => {
    expect(descreverAlteracao(alt('previsao_forn_date', null, '2026-11-14'))).toBe('Previsão: vazio → 14/11/2026')
    expect(descreverAlteracao(alt('deleted_at', null, '2026-11-11T10:00:00Z'))).toBe('Excluído')
    expect(descreverAlteracao(alt('deleted_at', '2026-11-11T10:00:00Z', null))).toBe('Exclusão desfeita')
    expect(descreverAlteracao(alt('preco_unitario: Item X', '10', '12.5'))).toBe('Preço de Item X: R$ 10,00 → R$ 12,50')
  })
  it('formata data e hora', () => {
    expect(dataHora(new Date(2026, 10, 11, 9, 5).toISOString())).toBe('11/11/2026 09:05')
    expect(dataHora('inválido')).toBe('inválido')
  })
})

describe('iniciais', () => {
  it('usa primeiro e último nome, ou o começo do e-mail', () => {
    expect(iniciais('Maria da Silva')).toBe('MS')
    expect(iniciais('compras.11@exemplo.org')).toBe('C1')
    expect(iniciais('fulano@exemplo.org')).toBe('FU')
  })
})

describe('construirSemana', () => {
  it('devolve domingo a sábado da semana do dia', () => {
    const semana = construirSemana(new Date(2026, 10, 11)) // quarta
    expect(semana.map((c) => c.chave)).toEqual([
      '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14',
    ])
  })
})

describe('contadoresModulos', () => {
  it('soma o que pede ação em cada módulo e zera sem permissão', () => {
    const c = contadoresModulos(
      { abertas: 5, precisaAcao: 3, criticas: 1, vencidas: 1, semPrevisao: 0, previsaoDescumprida: 0, aConfirmar: 0, entregas: [] },
      { ativos: 4, vencidos: 1, em30: 2, em90: 1, lista: [] },
      null,
    )
    expect(c).toEqual({ ocs: 3, contratos: 3, opmes: 0, pareceres: 0 })
  })
})

describe('página do OPME', () => {
  const hoje = new Date(2026, 10, 16)
  it('conta os dias até a cirurgia', () => {
    expect(diasAteCirurgia('2026-11-16', hoje)).toBe(0)
    expect(diasAteCirurgia('2026-11-19', hoje)).toBe(3)
    expect(diasAteCirurgia('2026-11-14', hoje)).toBe(-2)
  })
  it('rótulo do prazo', () => {
    expect(rotuloPrazoCirurgia(0)).toBe('Hoje')
    expect(rotuloPrazoCirurgia(1)).toBe('Amanhã')
    expect(rotuloPrazoCirurgia(5)).toBe('Em 5 dias')
    expect(rotuloPrazoCirurgia(-1)).toBe('Ontem')
    expect(rotuloPrazoCirurgia(-3)).toBe('Há 3 dias')
  })
  it('mensagem cita paciente e data', () => {
    const m = mensagemConfirmacaoOpme({ paciente: 'Paciente Teste', dataCirurgia: '2026-11-20' }, 'HUV')
    expect(m).toContain('Paciente Teste')
    expect(m).toContain('20/11/2026')
  })
})

describe('reaproveitar dados no formulário de OPME (item 109)', () => {
  const base = { status: 'pendente' as const, hospitalId: 'huv' as const }
  const opmes = [
    { ...base, id: 'a', paciente: 'José da Silva', dataCirurgia: '2026-03-10', fornecedorId: 7, observacao: 'Kit coluna' },
    { ...base, id: 'b', paciente: 'JOSE  DA SILVA', dataCirurgia: '2026-05-02', fornecedorId: 9, observacao: '' },
    { ...base, id: 'c', paciente: 'Maria Souza', dataCirurgia: '2026-04-01', fornecedorId: null, observacao: 'x' },
  ]

  it('agrupa por paciente sem acento e usa a cirurgia mais recente como modelo', () => {
    const lista = pacientesDeOpmes(opmes)
    expect(lista).toHaveLength(2)
    const jose = acharPaciente(lista, 'jose da silva')!
    expect(jose.opmes).toHaveLength(2)
    expect(jose.ultimo.id).toBe('b')
    expect(pacientesDeOpmes(opmes, 'b').find((p) => p.chave === jose.chave)!.ultimo.id).toBe('a')
  })

  it('copia fornecedor e observação só nos campos vazios', () => {
    const destino = { ...base, id: 'n', paciente: 'José', dataCirurgia: '', fornecedorId: null, observacao: '' }
    const r = copiarDadosPaciente(destino, opmes[0])
    expect(r.opme.fornecedorId).toBe(7)
    expect(r.opme.observacao).toBe('Kit coluna')
    expect(r.preenchidos).toEqual(['fornecedor', 'observação'])
    const preenchido = copiarDadosPaciente({ ...destino, fornecedorId: 3, observacao: 'minha' }, opmes[0])
    expect(preenchido.opme.fornecedorId).toBe(3)
    expect(preenchido.opme.observacao).toBe('minha')
    expect(preenchido.preenchidos).toEqual([])
  })

  it('conta o uso de cada fornecedor', () => {
    const uso = usoFornecedoresEmOpme([...opmes, { ...opmes[0], id: 'd' }])
    expect(uso.get(7)).toBe(2)
    expect(uso.get(9)).toBe(1)
    expect(uso.has(0)).toBe(false)
  })
})
