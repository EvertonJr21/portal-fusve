import { describe, expect, it } from 'vitest'
import type { Produto } from '@/data/produtos'
import { buscarProdutos } from './produtos'

const CATALOGO: Produto[] = [
  { cod: '1995', nome: 'AGULHA 13 X 4,5MM', cat: 'AGULHAS' },
  { cod: '199', nome: 'SERINGA 10ML', cat: 'SERINGAS' },
  { cod: '19951', nome: 'CATETER COM AGULHA', cat: 'CATETERES' },
  { cod: '3001', nome: 'LUVA PARA PROCEDIMENTO TAM M', cat: 'LUVAS' },
  { cod: '3002', nome: 'LUVA CIRURGICA ESTERIL 7,5', cat: 'LUVAS' },
]

describe('buscarProdutos', () => {
  it('termo vazio não retorna nada', () => {
    expect(buscarProdutos(CATALOGO, '   ')).toEqual([])
  })

  it('busca por código: exato primeiro, depois prefixo', () => {
    expect(buscarProdutos(CATALOGO, '199').map((p) => p.cod)).toEqual(['199', '1995', '19951'])
  })

  it('busca por várias palavras em qualquer ordem', () => {
    expect(buscarProdutos(CATALOGO, 'luva proc m').map((p) => p.cod)).toEqual(['3001'])
  })

  it('ignora acento no termo digitado', () => {
    expect(buscarProdutos(CATALOGO, 'cirúrgica').map((p) => p.cod)).toEqual(['3002'])
  })

  it('nome que começa com o termo vem antes do que só contém', () => {
    expect(buscarProdutos(CATALOGO, 'agulha').map((p) => p.cod)).toEqual(['1995', '19951'])
  })

  it('respeita o limite', () => {
    expect(buscarProdutos(CATALOGO, 'luva', 1)).toHaveLength(1)
  })
})
