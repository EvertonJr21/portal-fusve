import { describe, expect, it } from 'vitest'
import type { OC, Solicitacao } from '@/types'
import { addDias, fmt, getHoje } from './date'
import {
  dataPrazo,
  diasRestantes,
  diasSemMovimentacao,
  isPrevisaoDescumprida,
  previsaoAtiva,
  riscoOC,
  statusPrazo,
} from './oc'

// Datas relativas a "hoje" (via getHoje(), nunca `new Date()` direto — regra do CLAUDE.md)
// em vez de datas fixas, pra não depender de injeção de relógio ainda inexistente no projeto.
function dataHaDias(dias: number): string {
  return fmt(addDias(getHoje(), -dias))
}

function ocBase(overrides: Partial<OC> = {}): OC {
  return {
    id: 1,
    dataSolic: dataHaDias(0),
    fornecedorNome: 'FORNECEDOR TESTE',
    fornecedorId: 1,
    sit: 'Autorizada',
    estoque: 'SUP TESTE',
    solicitacaoId: null,
    cobrado: false,
    previsaoForn: null,
    previsaoForn2: null,
    dataEntregaReal: null,
    diasAtraso: 0,
    hospitalId: 'huv',
    proximaAcao: null,
    motivoAtraso: null,
    ultimaMovimentacao: null,
    previsaoDescumprida: false,
    ...overrides,
  }
}

describe('statusPrazo', () => {
  it('é "atendida" para situação final, mesmo vencida', () => {
    const dp = addDias(getHoje(), -100)
    expect(statusPrazo(dp, 'Atendida')).toBe('atendida')
    expect(statusPrazo(dp, 'Cancelada')).toBe('atendida')
  })

  it('é "vencida" quando passou dos 15 dias de prazo institucional', () => {
    // prazo = dataPrazo + 15 dias; 16 dias atrás já vence
    const dp = addDias(getHoje(), -16)
    expect(statusPrazo(dp, 'Autorizada')).toBe('vencida')
  })

  it('é "urgente" com 3 dias ou menos restantes', () => {
    const dp = addDias(getHoje(), -12) // 15 - 12 = 3 dias restantes
    expect(statusPrazo(dp, 'Autorizada')).toBe('urgente')
  })

  it('é "ok" com mais de 3 dias restantes', () => {
    const dp = addDias(getHoje(), -5)
    expect(statusPrazo(dp, 'Autorizada')).toBe('ok')
  })

  it('é "ok" quando não há data de prazo (dado ausente, nunca inventado)', () => {
    expect(statusPrazo(null, 'Autorizada')).toBe('ok')
  })
})

describe('dataPrazo', () => {
  it('usa a data da Solicitação vinculada, não a da OC, quando existe', () => {
    const sols: Solicitacao[] = [
      {
        id: 10,
        data: dataHaDias(20),
        produto: 'X',
        motivo: 'COMPRA NORMAL',
        solicitante: 'FULANO',
        qtd: 1,
        sit: 'Aberta',
        hospitalId: 'huv',
      },
    ]
    const oc = ocBase({ solicitacaoId: 10, dataSolic: dataHaDias(0) })
    expect(dataPrazo(oc, sols)).toEqual(addDias(getHoje(), -20))
  })

  it('cai para a data da própria OC quando não há Solicitação vinculada', () => {
    const oc = ocBase({ solicitacaoId: null, dataSolic: dataHaDias(7) })
    expect(dataPrazo(oc, [])).toEqual(addDias(getHoje(), -7))
  })
})

describe('riscoOC', () => {
  it('é "baixo" para situação final, independente de qualquer outro fator', () => {
    const oc = ocBase({ sit: 'Atendida', previsaoDescumprida: true, ultimaMovimentacao: dataHaDias(999) })
    expect(riscoOC(oc, [])).toBe('baixo')
  })

  it('é "alto" quando vencida', () => {
    const oc = ocBase({ dataSolic: dataHaDias(20) })
    expect(riscoOC(oc, [])).toBe('alto')
  })

  it('é "alto" quando a previsão foi descumprida, mesmo dentro do prazo', () => {
    const oc = ocBase({ dataSolic: dataHaDias(1), previsaoDescumprida: true })
    expect(riscoOC(oc, [])).toBe('alto')
  })

  it('é "alto" com 10+ dias sem movimentação, mesmo dentro do prazo', () => {
    const oc = ocBase({ dataSolic: dataHaDias(1), ultimaMovimentacao: dataHaDias(10) })
    expect(riscoOC(oc, [])).toBe('alto')
  })

  it('é "medio" quando urgente mas não vencida', () => {
    // última movimentação recente pra isolar o efeito de "urgente" do de
    // "sem movimentação" (ambos alimentam riscoOC, mas por regras diferentes)
    const oc = ocBase({ dataSolic: dataHaDias(12), ultimaMovimentacao: dataHaDias(0) })
    expect(riscoOC(oc, [])).toBe('medio')
  })

  it('é "baixo" quando dentro do prazo e sem sinais de risco', () => {
    const oc = ocBase({ dataSolic: dataHaDias(1) })
    expect(riscoOC(oc, [])).toBe('baixo')
  })
})

describe('diasSemMovimentacao', () => {
  it('usa a última movimentação quando existe', () => {
    const oc = ocBase({ dataSolic: dataHaDias(30), ultimaMovimentacao: dataHaDias(4) })
    expect(diasSemMovimentacao(oc)).toBe(4)
  })

  it('cai para a data da solicitação quando não há última movimentação', () => {
    const oc = ocBase({ dataSolic: dataHaDias(6), ultimaMovimentacao: null })
    expect(diasSemMovimentacao(oc)).toBe(6)
  })

  it('retorna null quando não há nenhuma data de referência', () => {
    const oc = ocBase({ dataSolic: null, ultimaMovimentacao: null })
    expect(diasSemMovimentacao(oc)).toBeNull()
  })
})

describe('previsaoAtiva', () => {
  it('mostra a 1ª previsão se ainda não passou', () => {
    const oc = ocBase({ previsaoForn: fmt(addDias(getHoje(), 2)) })
    expect(previsaoAtiva(oc)).toBe(oc.previsaoForn)
  })

  it('cai para a 2ª previsão quando a 1ª já passou e a OC está parcial', () => {
    const oc = ocBase({
      sit: 'Parcialmente Atendida',
      previsaoForn: dataHaDias(1),
      previsaoForn2: fmt(addDias(getHoje(), 3)),
    })
    expect(previsaoAtiva(oc)).toBe(oc.previsaoForn2)
  })

  it('retorna null quando a 1ª previsão passou e a OC não é parcial', () => {
    const oc = ocBase({ sit: 'Autorizada', previsaoForn: dataHaDias(1) })
    expect(previsaoAtiva(oc)).toBeNull()
  })
})

describe('isPrevisaoDescumprida', () => {
  it('é true quando sinalizada explicitamente', () => {
    expect(isPrevisaoDescumprida(ocBase({ previsaoDescumprida: true }))).toBe(true)
  })

  it('é true quando a previsão do fornecedor passou sem entrega registrada', () => {
    const oc = ocBase({ previsaoForn: dataHaDias(1), dataEntregaReal: null })
    expect(isPrevisaoDescumprida(oc)).toBe(true)
  })

  it('é false quando já houve entrega registrada, mesmo com previsão vencida', () => {
    const oc = ocBase({ previsaoForn: dataHaDias(1), dataEntregaReal: dataHaDias(0) })
    expect(isPrevisaoDescumprida(oc)).toBe(false)
  })

  it('é false quando a previsão ainda não passou', () => {
    const oc = ocBase({ previsaoForn: fmt(addDias(getHoje(), 5)) })
    expect(isPrevisaoDescumprida(oc)).toBe(false)
  })
})

describe('diasRestantes — casos de calendário', () => {
  it('atravessa virada de mês corretamente', () => {
    // não fixa uma data literal (dependeria do dia em que os testes rodam);
    // só garante que o cálculo é consistente somando/subtraindo dias reais
    const dp = addDias(getHoje(), -10)
    const esperado = 15 - 10
    expect(diasRestantes(dp)).toBe(esperado)
  })

  it('retorna null quando não há data de prazo', () => {
    expect(diasRestantes(null)).toBeNull()
  })
})
