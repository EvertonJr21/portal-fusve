import { describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'
import { toFornecedor } from './fornecedorRepository'

type FornRow = Database['public']['Tables']['forns']['Row']

function rowBase(overrides: Partial<FornRow> = {}): FornRow {
  return {
    id: 501,
    nome: 'FORNECEDOR TESTE LTDA',
    email: 'contato@fornecedor.com',
    wpp: '5524999999999',
    created_at: null,
    updated_at: null,
    deleted_at: null,
    ...overrides,
  }
}

describe('toFornecedor', () => {
  it('mapeia a linha preservando os valores', () => {
    const forn = toFornecedor(rowBase())
    expect(forn.id).toBe(501)
    expect(forn.nome).toBe('FORNECEDOR TESTE LTDA')
    expect(forn.email).toBe('contato@fornecedor.com')
    expect(forn.wpp).toBe('5524999999999')
  })

  it('usa string vazia como padrão pra email/wpp nulos', () => {
    const forn = toFornecedor(rowBase({ email: null, wpp: null }))
    expect(forn.email).toBe('')
    expect(forn.wpp).toBe('')
  })
})
