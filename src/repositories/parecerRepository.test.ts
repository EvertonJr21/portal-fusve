import { describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'
import { sanitizarParaStorage, toParecer } from './parecerRepository'

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
    data_parecer_date: '2026-09-10',
    parecer: 'Texto do parecer',
    pdf_data_url: null,
    pdf_path: null,
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

  it('converte data_parecer_date (YYYY-MM-DD) pra DD/MM/YYYY', () => {
    const p = toParecer(rowBase({ data_parecer_date: '2026-01-05' }))
    expect(p.dataParecer).toBe('05/01/2026')
  })

  it('usa string vazia quando data_parecer_date é nula (passo 6 — coluna texto removida)', () => {
    const p = toParecer(rowBase({ data_parecer_date: null }))
    expect(p.dataParecer).toBe('')
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
      rowBase({ observacao: null, responsavel: null, data_parecer_date: null, parecer: null }),
    )
    expect(p.observacao).toBe('')
    expect(p.responsavel).toBe('')
    expect(p.dataParecer).toBe('')
    expect(p.parecer).toBe('')
  })

  it('preserva pdfDataUrl nulo (nem todo parecer tem PDF anexado)', () => {
    expect(toParecer(rowBase({ pdf_data_url: null })).pdfDataUrl).toBeNull()
  })

  it('preserva pdfPath (Storage) separado de pdfDataUrl (base64 legado)', () => {
    const p = toParecer(rowBase({ pdf_path: '22045/123-parecer.pdf', pdf_data_url: 'data:application/pdf;base64,xxx' }))
    expect(p.pdfPath).toBe('22045/123-parecer.pdf')
    expect(p.pdfDataUrl).toBe('data:application/pdf;base64,xxx')
  })
})

describe('sanitizarParaStorage', () => {
  // Bug real de produção (21/09/2026): Storage do Supabase recusa a chave com
  // "Invalid key" quando tem acento/espaço — ex: marca "BIOMEDICAL SP" e
  // arquivo "PARECER TÉCNICO DE CATETER PERMICATH 40CM DA BIOMEDICAL-1.pdf".
  it('remove acentos preservando a letra base', () => {
    expect(sanitizarParaStorage('PARECER TÉCNICO')).toBe('PARECER_TECNICO')
  })

  it('troca espaço por underscore', () => {
    expect(sanitizarParaStorage('BIOMEDICAL SP')).toBe('BIOMEDICAL_SP')
  })

  it('preserva ponto, hífen e underscore (não são o problema)', () => {
    expect(sanitizarParaStorage('arquivo-1.pdf')).toBe('arquivo-1.pdf')
    expect(sanitizarParaStorage('nome_com_underscore')).toBe('nome_com_underscore')
  })

  it('preserva alfanumérico puro sem alterar nada', () => {
    expect(sanitizarParaStorage('22045')).toBe('22045')
  })
})
