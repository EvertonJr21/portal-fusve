import { describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'
import { toParecer } from './parecerRepository'

type ParecerRow = Database['public']['Tables']['pareceres']['Row']

function rowBase(overrides: Partial<ParecerRow> = {}): ParecerRow {
  return {
    cod: '22045',
    nome: 'AGULHA 25 X 0,7MM',
    cat: 'AGULHAS',
    padrao: ['BD'],
    permitidas: ['DESCARPACK'],
    restritas: [],
    proibidas: [],
    observacao: 'Observação técnica',
    responsavel: 'FULANO',
    data_parecer: '10/09/2026',
    data_parecer_date: '2026-09-10',
    parecer: 'Texto do parecer',
    pdf_data_url: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

describe('toParecer', () => {
  it('mapeia snake_case pra camelCase preservando os valores', () => {
    const p = toParecer(rowBase())
    expect(p.cod).toBe('22045')
    expect(p.nome).toBe('AGULHA 25 X 0,7MM')
    expect(p.padrao).toEqual(['BD'])
    expect(p.dataParecer).toBe('10/09/2026')
  })

  it('prefere data_parecer_date (Fase 2 da migração de datas) sobre o texto legado', () => {
    const p = toParecer(rowBase({ data_parecer: '01/01/2000', data_parecer_date: '2026-09-10' }))
    expect(p.dataParecer).toBe('10/09/2026')
  })

  it('cai pro texto legado quando data_parecer_date ainda não foi backfillada', () => {
    const p = toParecer(rowBase({ data_parecer: '10/09/2026', data_parecer_date: null }))
    expect(p.dataParecer).toBe('10/09/2026')
  })

  it('usa array vazio como padrão pras marcas nulas', () => {
    // @ts-expect-error o schema marca como NOT NULL, mas o mapeamento é defensivo
    const p = toParecer(rowBase({ padrao: null, permitidas: null, restritas: null, proibidas: null }))
    expect(p.padrao).toEqual([])
    expect(p.permitidas).toEqual([])
    expect(p.restritas).toEqual([])
    expect(p.proibidas).toEqual([])
  })

  it('usa string vazia como padrão pros campos de texto nulos', () => {
    const p = toParecer(
      // @ts-expect-error o schema marca como NOT NULL, mas o mapeamento é defensivo
      rowBase({ observacao: null, responsavel: null, data_parecer: null, data_parecer_date: null, parecer: null }),
    )
    expect(p.observacao).toBe('')
    expect(p.responsavel).toBe('')
    expect(p.dataParecer).toBe('')
    expect(p.parecer).toBe('')
  })

  it('preserva pdfDataUrl nulo (nem todo parecer tem PDF anexado)', () => {
    expect(toParecer(rowBase({ pdf_data_url: null })).pdfDataUrl).toBeNull()
  })
})
