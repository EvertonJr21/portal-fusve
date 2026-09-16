import { describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'
import { toOC } from './ocRepository'

type OCRow = Database['public']['Tables']['ocs']['Row']

function rowBase(overrides: Partial<OCRow> = {}): OCRow {
  return {
    id: 78842,
    data_solic_date: '2026-09-01',
    fornecedor_nome: 'FORNECEDOR TESTE',
    fornecedor_id: 501,
    sit: 'Autorizada',
    estoque: 'SUP CAF',
    solicitacao_id: null,
    cobrado: false,
    previsao_forn_date: null,
    data_entrega_real_date: null,
    dias_atraso: 0,
    created_at: null,
    updated_at: null,
    hospital_id: 'huv',
    proxima_acao: null,
    motivo_atraso: null,
    ultima_movimentacao_date: null,
    previsao_descumprida: false,
    deleted_at: null,
    previsao_forn2_date: null,
    ...overrides,
  }
}

describe('toOC', () => {
  it('mapeia snake_case pra camelCase preservando os valores', () => {
    const oc = toOC(rowBase())
    expect(oc.id).toBe(78842)
    expect(oc.dataSolic).toBe('01/09/2026')
    expect(oc.fornecedorNome).toBe('FORNECEDOR TESTE')
    expect(oc.hospitalId).toBe('huv')
  })

  it('converte as 5 colunas *_date (YYYY-MM-DD) pra DD/MM/YYYY', () => {
    const oc = toOC(
      rowBase({
        data_solic_date: '2026-09-01',
        previsao_forn_date: '2026-09-10',
        previsao_forn2_date: '2026-09-15',
        data_entrega_real_date: '2026-09-12',
        ultima_movimentacao_date: '2026-09-05',
      }),
    )
    expect(oc.dataSolic).toBe('01/09/2026')
    expect(oc.previsaoForn).toBe('10/09/2026')
    expect(oc.previsaoForn2).toBe('15/09/2026')
    expect(oc.dataEntregaReal).toBe('12/09/2026')
    expect(oc.ultimaMovimentacao).toBe('05/09/2026')
  })

  it('usa null quando as colunas *_date são nulas (passo 6 — colunas texto removidas)', () => {
    const oc = toOC(rowBase({ previsao_forn_date: null, data_entrega_real_date: null }))
    expect(oc.previsaoForn).toBeNull()
    expect(oc.dataEntregaReal).toBeNull()
  })

  // O tipo gerado do schema (Database) marca sit/cobrado/fornecedor_nome como
  // nullable porque a coluna do Postgres permite NULL, mas o domínio (OC)
  // nunca deveria ter esses campos vazios na prática — os defaults abaixo
  // documentam essa suposição, não são comportamento arbitrário.
  it('usa "Autorizada" como situação padrão se a coluna vier nula', () => {
    expect(toOC(rowBase({ sit: null })).sit).toBe('Autorizada')
  })

  it('usa false como padrão se "cobrado" vier nulo', () => {
    expect(toOC(rowBase({ cobrado: null })).cobrado).toBe(false)
  })

  it('usa string vazia como padrão se o nome do fornecedor vier nulo', () => {
    expect(toOC(rowBase({ fornecedor_nome: null })).fornecedorNome).toBe('')
  })

  it('usa 0 como padrão se dias_atraso vier nulo', () => {
    expect(toOC(rowBase({ dias_atraso: null })).diasAtraso).toBe(0)
  })

  it('usa false como padrão se previsao_descumprida vier nula', () => {
    expect(toOC(rowBase({ previsao_descumprida: null })).previsaoDescumprida).toBe(false)
  })
})
