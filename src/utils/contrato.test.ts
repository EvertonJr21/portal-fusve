import { describe, expect, it } from 'vitest'
import { formatarPrecoBR, lerListaColada, parsePrecoBR } from './contrato'

describe('formatarPrecoBR', () => {
  it('formata com vírgula decimal e milhar', () => {
    expect(formatarPrecoBR(387.69)).toBe('387,69')
    expect(formatarPrecoBR(1234.5)).toBe('1.234,50')
  })
  it('zero vira campo vazio', () => {
    expect(formatarPrecoBR(0)).toBe('')
  })
})

describe('parsePrecoBR', () => {
  it('lê formato brasileiro', () => {
    expect(parsePrecoBR('1.234,56')).toBe(1234.56)
    expect(parsePrecoBR('387,69')).toBe(387.69)
  })
  it('lê ponto decimal e prefixo R$', () => {
    expect(parsePrecoBR('387.69')).toBe(387.69)
    expect(parsePrecoBR('R$ 12')).toBe(12)
  })
  it('texto vazio ou inválido vira 0', () => {
    expect(parsePrecoBR('')).toBe(0)
    expect(parsePrecoBR('abc')).toBe(0)
  })
})

describe('lerListaColada', () => {
  it('um código por linha, com ou sem preço no fim', () => {
    expect(lerListaColada('16874 700,00\n16876\n\n2868\tFIO ETHIBOND 2-0\t12,5')).toEqual([
      { cod: '16874', preco: 700 },
      { cod: '16876', preco: null },
      { cod: '2868', preco: 12.5 },
    ])
  })

  it('vários códigos na mesma linha e repetidos ignorados', () => {
    expect(lerListaColada('16874, 16876 16880\n16874')).toEqual([
      { cod: '16874', preco: null },
      { cod: '16876', preco: null },
      { cod: '16880', preco: null },
    ])
  })

  it('não confunde medida da descrição com preço; ignora linha sem código no início', () => {
    expect(lerListaColada('16874;STENT 2.50X12\nCÓDIGO;DESCRIÇÃO\n100;R$ 1.234,56')).toEqual([
      { cod: '16874', preco: null },
      { cod: '100', preco: 1234.56 },
    ])
  })
})
