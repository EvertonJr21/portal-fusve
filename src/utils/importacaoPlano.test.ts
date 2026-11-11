import { describe, expect, it } from 'vitest'
import type { OC, Solicitacao } from '@/types'
import type { OCImportada, SolImportada } from './csv'
import { emLotes, emParalelo, planejarOCs, planejarSols } from './importacaoPlano'

const HOJE = '11/11/2026'

function oc(p: Partial<OC> = {}): OC {
  return {
    id: 1, dataSolic: '01/11/2026', fornecedorNome: 'FORN A', fornecedorId: 10, sit: 'Autorizada', estoque: 'SUP CAF',
    solicitacaoId: null, cobrado: false, previsaoForn: null, previsaoForn2: null, dataEntregaReal: null, dataParcial: null,
    dataEntregaOrigem: null, entradaMv: '', qtdEntradas: 0, diasAtraso: 0, hospitalId: 'huv', proximaAcao: null,
    motivoAtraso: null, ultimaMovimentacao: '01/11/2026', previsaoDescumprida: false, ...p,
  }
}

function linha(p: Partial<OCImportada> = {}): OCImportada {
  return { id: 1, dataSolic: '01/11/2026', sit: 'Autorizada', fornecedorId: 10, fornecedorNome: 'FORN A', previsaoForn: '20/11/2026', diasAtraso: 0, estoque: '', ...p }
}

describe('planejarOCs', () => {
  it('separa nova, atualização, sem mudança e de outro hospital', () => {
    const existentes = new Map([[1, oc({ id: 1 })], [2, oc({ id: 2 })]])
    const plano = planejarOCs(
      [linha({ id: 1 }), linha({ id: 2, sit: 'Atendida' }), linha({ id: 3 }), linha({ id: 4 })],
      existentes,
      new Map([[4, 'mkr']]),
      'huv',
      HOJE,
    )
    expect(plano.semMudanca).toBe(1)
    expect(plano.atualizacoes).toHaveLength(1)
    expect(plano.atualizacoes[0].patch).toEqual({ sit: 'Atendida', dataEntregaReal: HOJE, dataEntregaOrigem: 'estimada' })
    expect(plano.mudamSituacao).toBe(1)
    expect(plano.novas.map((n) => n.id)).toEqual([3])
    expect(plano.outroHospital).toEqual([{ id: 4, hospital: 'mkr' }])
  })

  it('OC nova nunca traz a previsão do relatório e usa estoque padrão', () => {
    const [n] = planejarOCs([linha({ id: 9 })], new Map(), new Map(), 'mkr', HOJE).novas
    expect(n.previsaoForn).toBeNull()
    expect(n.estoque).toBe('SUP CAF')
    expect(n.hospitalId).toBe('mkr')
  })

  it('não regride situação nem sobrescreve entrega já registrada', () => {
    const existentes = new Map([
      [1, oc({ id: 1, sit: 'Atendida' })],
      [2, oc({ id: 2, sit: 'Parcialmente Atendida', dataEntregaReal: '05/11/2026', dataEntregaOrigem: 'manual' })],
    ])
    const plano = planejarOCs([linha({ id: 1, sit: 'Autorizada' }), linha({ id: 2, sit: 'Atendida' })], existentes, new Map(), 'huv', HOJE)
    expect(plano.semMudanca).toBe(1)
    expect(plano.atualizacoes[0].patch).toEqual({ sit: 'Atendida' })
  })

  it('linha repetida no relatório entra uma vez só', () => {
    expect(planejarOCs([linha({ id: 7 }), linha({ id: 7 })], new Map(), new Map(), 'huv', HOJE).novas).toHaveLength(1)
  })
})

describe('planejarSols', () => {
  const sol = (p: Partial<SolImportada> = {}): SolImportada => ({
    id: 1, data: '01/11/2026', produto: 'LUVA', motivo: 'COMPRA NORMAL', solicitante: 'ANA', qtd: 1, sit: 'Aberta', estoque: '', hospitalId: 'huv', ...p,
  })
  it('só preenche campo vazio de solicitação existente', () => {
    const existente: Solicitacao = { id: 1, data: '01/11/2026', produto: 'LUVA', motivo: '', solicitante: 'ANA', qtd: 1, sit: 'Aberta', hospitalId: 'huv' }
    const plano = planejarSols([sol(), sol({ id: 2 })], new Map([[1, existente]]), new Map(), 'huv')
    expect(plano.atualizacoes[0].patch).toEqual({ motivo: 'COMPRA NORMAL' })
    expect(plano.novas.map((n) => n.id)).toEqual([2])
  })
})

describe('emLotes / emParalelo', () => {
  it('divide em lotes', () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
  it('um item com erro não interrompe os outros e o erro fica na posição dele', async () => {
    const feitos: number[] = []
    const erros = await emParalelo([1, 2, 3, 4], 2, async (n) => {
      if (n === 3) throw new Error('falhou')
      feitos.push(n)
    })
    expect(feitos.sort()).toEqual([1, 2, 4])
    expect(erros.map((e) => (e ? 'x' : '-')).join('')).toBe('--x-')
  })
})
