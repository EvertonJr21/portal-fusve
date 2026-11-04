import { describe, expect, it } from 'vitest'
import { formatarPrecoBR, parsePrecoBR } from './contrato'

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
