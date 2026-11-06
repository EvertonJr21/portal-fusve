import { describe, expect, it } from 'vitest'
import { temAlgumaMarca, temConteudoParecer } from './marcas'

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
