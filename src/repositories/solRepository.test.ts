import { describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'
import { toSolicitacao } from './solRepository'

type SolRow = Database['public']['Tables']['sols']['Row']

function rowBase(overrides: Partial<SolRow> = {}): SolRow {
  return {
    id: 54321,
    data: '15/08/2026',
    produto: 'SERINGA DESCARTAVEL 10ML',
    motivo: 'COMPRA NORMAL',
    solicitante: 'MARIA DA SILVA',
    qtd: 5,
    sit: 'Aberta',
    hospital_id: 'huv',
    created_at: null,
    updated_at: null,
    deleted_at: null,
    ...overrides,
  }
}

describe('toSolicitacao', () => {
  it('mapeia snake_case pra camelCase preservando os valores', () => {
    const sol = toSolicitacao(rowBase())
    expect(sol.id).toBe(54321)
    expect(sol.produto).toBe('SERINGA DESCARTAVEL 10ML')
    expect(sol.hospitalId).toBe('huv')
  })

  it('usa string vazia como padrão pra produto/motivo/solicitante nulos', () => {
    const sol = toSolicitacao(rowBase({ produto: null, motivo: null, solicitante: null }))
    expect(sol.produto).toBe('')
    expect(sol.motivo).toBe('')
    expect(sol.solicitante).toBe('')
  })

  it('usa 0 como padrão se qtd vier nula', () => {
    expect(toSolicitacao(rowBase({ qtd: null })).qtd).toBe(0)
  })

  it('usa "Aberta" como padrão se sit vier nula', () => {
    expect(toSolicitacao(rowBase({ sit: null })).sit).toBe('Aberta')
  })
})
