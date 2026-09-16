import { describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'
import { toHistOC } from './histOcRepository'

type HistOCRow = Database['public']['Tables']['hist_oc']['Row']

function rowBase(overrides: Partial<HistOCRow> = {}): HistOCRow {
  return {
    hid: 1,
    oc_id: 78842,
    ts: 1_700_000_000_000,
    canal: 'wpp',
    resposta: 'Fornecedor confirmou entrega pra semana que vem',
    tipo: 'individual',
    created_at: null,
    respondido_em: null,
    ...overrides,
  }
}

describe('toHistOC', () => {
  it('mapeia snake_case pra camelCase preservando os valores', () => {
    const h = toHistOC(rowBase())
    expect(h.hid).toBe(1)
    expect(h.ocId).toBe(78842)
    expect(h.canal).toBe('wpp')
    expect(h.resposta).toBe('Fornecedor confirmou entrega pra semana que vem')
  })

  it('usa 0 como padrão se oc_id/ts vierem nulos', () => {
    const h = toHistOC(rowBase({ oc_id: null, ts: null }))
    expect(h.ocId).toBe(0)
    expect(h.ts).toBe(0)
  })

  it('usa string vazia como padrão se resposta vier nula', () => {
    expect(toHistOC(rowBase({ resposta: null })).resposta).toBe('')
  })

  it('converte respondido_em (ISO string) pra timestamp numérico', () => {
    const h = toHistOC(rowBase({ respondido_em: '2026-09-16T12:00:00.000Z' }))
    expect(h.respondidoEm).toBe(new Date('2026-09-16T12:00:00.000Z').getTime())
  })

  it('mantém respondidoEm nulo quando ainda não foi respondida', () => {
    expect(toHistOC(rowBase({ respondido_em: null })).respondidoEm).toBeNull()
  })
})
