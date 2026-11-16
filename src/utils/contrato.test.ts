import { describe, expect, it } from 'vitest'
import { formatarPrecoBR, lerListaColada, marcosVigencia, parsePrecoBR } from './contrato'

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

describe('marcosVigencia', () => {
  const c = { vigenciaInicio: '2026-01-01', vigenciaFim: '2026-12-31', avisoRenovacaoDias: 90 }
  it('calcula o aviso e o tempo decorrido', () => {
    const m = marcosVigencia(c, new Date(2026, 6, 2))
    expect(m.avisoEm?.toLocaleDateString('pt-BR')).toBe('02/10/2026')
    expect(m.duracaoDias).toBe(364)
    expect(m.pctDecorrido).toBe(50)
  })
  it('limita entre 0 e 100', () => {
    expect(marcosVigencia(c, new Date(2025, 5, 1)).pctDecorrido).toBe(0)
    expect(marcosVigencia(c, new Date(2027, 5, 1)).pctDecorrido).toBe(100)
  })
  it('sem início não calcula progresso', () => {
    const m = marcosVigencia({ ...c, vigenciaInicio: null }, new Date(2026, 6, 2))
    expect(m.pctDecorrido).toBeNull()
    expect(m.fim).not.toBeNull()
  })
})
