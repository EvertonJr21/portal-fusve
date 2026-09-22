import { describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'
import { toOpme } from './opmeRepository'

type OpmeRow = Database['public']['Tables']['opmes']['Row']

function rowBase(overrides: Partial<OpmeRow> = {}): OpmeRow {
  return {
    id: 'o1',
    paciente: 'FRANCISCA DE SOUZA MENDES',
    data_cirurgia: '2026-09-16',
    fornecedor_id: 501,
    hospital_id: 'mkr',
    status: 'pendente',
    observacao: null,
    deleted_at: null,
    created_at: null,
    owner_id: null,
    updated_at: null,
    ...overrides,
  }
}

describe('toOpme', () => {
  it('mapeia snake_case pra camelCase preservando os valores', () => {
    const o = toOpme(rowBase())
    expect(o.id).toBe('o1')
    expect(o.paciente).toBe('FRANCISCA DE SOUZA MENDES')
    expect(o.dataCirurgia).toBe('2026-09-16')
    expect(o.hospitalId).toBe('mkr')
    expect(o.status).toBe('pendente')
  })

  it('usa string vazia como padrão pra observacao nula', () => {
    expect(toOpme(rowBase({ observacao: null })).observacao).toBe('')
  })

  it('preserva fornecedorId nulo (pode não ter fornecedor definido ainda)', () => {
    expect(toOpme(rowBase({ fornecedor_id: null })).fornecedorId).toBeNull()
  })
})
