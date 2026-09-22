import { describe, expect, it } from 'vitest'
import { toMapa } from './marcaSugeridaRepository'

describe('toMapa', () => {
  it('monta um mapa categoria → marcas a partir das linhas', () => {
    const mapa = toMapa([
      { cat: 'AGULHAS', marcas: ['BD', 'DESCARPACK'], owner_id: 'u1', updated_at: null },
      { cat: 'CATETERES', marcas: ['B BRAUN'], owner_id: 'u1', updated_at: null },
    ])
    expect(mapa).toEqual({ AGULHAS: ['BD', 'DESCARPACK'], CATETERES: ['B BRAUN'] })
  })

  it('usa array vazio como padrão quando marcas vier nulo', () => {
    // @ts-expect-error o schema marca como NOT NULL, mas o mapeamento é defensivo
    const mapa = toMapa([{ cat: 'AGULHAS', marcas: null, owner_id: 'u1', updated_at: null }])
    expect(mapa.AGULHAS).toEqual([])
  })

  it('retorna mapa vazio pra lista vazia', () => {
    expect(toMapa([])).toEqual({})
  })
})
