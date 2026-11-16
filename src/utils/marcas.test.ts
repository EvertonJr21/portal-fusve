import { describe, expect, it } from 'vitest'
import { rotuloValidade, temAlgumaMarca, temConteudoParecer, validadeParecer } from './marcas'

const vazio = { padrao: [], permitidas: [], restritas: [], proibidas: [], requisitoTecnico: '' }

describe('temConteudoParecer', () => {
  it('é falso sem marca e sem requisito', () => {
    expect(temConteudoParecer(vazio)).toBe(false)
  })

  it('aceita parecer só com requisito técnico, sem marca', () => {
    const p = { ...vazio, requisitoTecnico: 'Só comprar se for de silicone' }
    expect(temAlgumaMarca(p)).toBe(false)
    expect(temConteudoParecer(p)).toBe(true)
  })

  it('ignora requisito feito só de espaços', () => {
    expect(temConteudoParecer({ ...vazio, requisitoTecnico: '   ' })).toBe(false)
  })

  it('aceita parecer só com marca', () => {
    expect(temConteudoParecer({ ...vazio, proibidas: ['ZELARA'] })).toBe(true)
  })
})

describe('validadeParecer', () => {
  const hoje = new Date(2026, 10, 16)
  it('lê DD/MM/AAAA e conta meses completos', () => {
    expect(validadeParecer('16/11/2025', hoje)).toEqual({ meses: 12, nivel: 'atencao' })
    expect(validadeParecer('17/11/2025', hoje)).toEqual({ meses: 11, nivel: 'ok' })
    expect(validadeParecer('01/03/2025', hoje)).toEqual({ meses: 20, nivel: 'revisar' })
  })
  it('sem data ou inválida → null', () => {
    expect(validadeParecer('', hoje)).toBeNull()
    expect(validadeParecer('xx', hoje)).toBeNull()
  })
  it('rótulo', () => {
    expect(rotuloValidade({ meses: 0, nivel: 'ok' })).toBe('menos de 1 mês')
    expect(rotuloValidade({ meses: 20, nivel: 'revisar' })).toBe('20 meses — revisar')
  })
})
