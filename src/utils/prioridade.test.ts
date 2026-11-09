import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { HistOC, OC } from '@/types'
import { avaliarPrioridade } from './prioridade'

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 9, 12)) // 09/11/2026
})
afterAll(() => {
  vi.useRealTimers()
})

function oc(p: Partial<OC> = {}): OC {
  return {
    id: 80000, dataSolic: '03/11/2026', fornecedorNome: 'F', fornecedorId: 1, sit: 'Autorizada', estoque: 'SUP CAF',
    solicitacaoId: null, cobrado: false, previsaoForn: null, previsaoForn2: null, dataEntregaReal: null, dataParcial: null,
    dataEntregaOrigem: null, entradaMv: '', qtdEntradas: 0, diasAtraso: 0, hospitalId: 'huv', proximaAcao: null,
    motivoAtraso: null, ultimaMovimentacao: '08/11/2026', previsaoDescumprida: false, ...p,
  }
}

describe('avaliarPrioridade — previsão confirmada', () => {
  it('entrega em 2+ dias dentro do prazo: só acompanhar, sai de "Precisa de ação"', () => {
    const r = avaliarPrioridade(oc({ previsaoForn: '11/11/2026' }), 4, null)
    expect(r.prioridade).toBe('normal')
    expect(r.acao).toMatch(/Previsão confirmada — entrega em 2d/)
  })
  it('1 dia antes da entrega volta como alta (aviso)', () => {
    expect(avaliarPrioridade(oc({ previsaoForn: '10/11/2026' }), 4, null)).toEqual({
      prioridade: 'alta',
      acao: 'Entrega amanhã — confirmar com o fornecedor',
    })
  })
  it('no dia da entrega: conferir recebimento', () => {
    expect(avaliarPrioridade(oc({ previsaoForn: '09/11/2026' }), 4, null).acao).toMatch(/hoje/)
  })
  it('previsão depois da data prometida continua alertando o prazo', () => {
    expect(avaliarPrioridade(oc({ previsaoForn: '20/11/2026' }), 2, null).acao).toMatch(/vence em 2d/)
  })
  it('sem previsão: cobrar previsão', () => {
    expect(avaliarPrioridade(oc(), 9, null).acao).toBe('Cobrar previsão de entrega')
  })
  it('cobrança sem resposta continua prevalecendo', () => {
    const h = { ts: new Date(2026, 10, 8).getTime(), respondidoEm: null } as unknown as HistOC
    expect(avaliarPrioridade(oc({ previsaoForn: '12/11/2026' }), 9, h).acao).toBe('Aguardar resposta da cobrança')
  })
})
