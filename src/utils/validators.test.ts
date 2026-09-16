import { describe, expect, it } from 'vitest'
import type { OCImportada, SolImportada } from './csv'
import type { VinculoAcomp } from './pdf'
import { ocImportadaSchema, solImportadaSchema, validarLote, vinculoAcompSchema } from './validators'

function ocValida(overrides: Partial<OCImportada> = {}): OCImportada {
  return {
    id: 78842,
    dataSolic: '01/09/2026',
    sit: 'Autorizada',
    fornecedorId: 501,
    fornecedorNome: 'FORNECEDOR TESTE LTDA',
    previsaoForn: '15/09/2026',
    diasAtraso: 3,
    estoque: 'SUP TESTE',
    ...overrides,
  }
}

describe('validarLote', () => {
  it('separa itens válidos dos inválidos sem descartar o lote inteiro', () => {
    const itens = [ocValida({ id: 1 }), ocValida({ id: -5 }), ocValida({ id: 2 })]
    const { validos, invalidos } = validarLote(itens, ocImportadaSchema)
    expect(validos.map((o) => o.id)).toEqual([1, 2])
    expect(invalidos).toHaveLength(1)
    expect(invalidos[0].item.id).toBe(-5)
    expect(invalidos[0].erros.length).toBeGreaterThan(0)
  })
})

describe('ocImportadaSchema', () => {
  it('aceita uma OC bem formada', () => {
    expect(ocImportadaSchema.safeParse(ocValida()).success).toBe(true)
  })

  it('rejeita id não positivo', () => {
    expect(ocImportadaSchema.safeParse(ocValida({ id: 0 })).success).toBe(false)
  })

  it('rejeita dataSolic fora do formato DD/MM/AAAA', () => {
    expect(ocImportadaSchema.safeParse(ocValida({ dataSolic: '2026-09-01' })).success).toBe(false)
  })

  it('rejeita fornecedorNome vazio ou muito curto', () => {
    expect(ocImportadaSchema.safeParse(ocValida({ fornecedorNome: '' })).success).toBe(false)
    expect(ocImportadaSchema.safeParse(ocValida({ fornecedorNome: 'A' })).success).toBe(false)
  })

  it('rejeita diasAtraso negativo', () => {
    expect(ocImportadaSchema.safeParse(ocValida({ diasAtraso: -1 })).success).toBe(false)
  })

  it('aceita previsaoForn nula (OC sem previsão do fornecedor)', () => {
    expect(ocImportadaSchema.safeParse(ocValida({ previsaoForn: null })).success).toBe(true)
  })

  it('rejeita previsaoForn em formato inválido quando presente', () => {
    expect(ocImportadaSchema.safeParse(ocValida({ previsaoForn: '15-09-2026' })).success).toBe(false)
  })
})

describe('solImportadaSchema', () => {
  function solValida(overrides: Partial<SolImportada> = {}): SolImportada {
    return {
      id: 54321,
      data: '15/08/2026',
      produto: 'SERINGA DESCARTAVEL 10ML',
      motivo: 'COMPRA NORMAL',
      solicitante: 'MARIA DA SILVA',
      qtd: 5,
      sit: 'Aberta',
      estoque: 'SUP TESTE',
      hospitalId: 'huv',
      ...overrides,
    }
  }

  it('aceita uma solicitação bem formada', () => {
    expect(solImportadaSchema.safeParse(solValida()).success).toBe(true)
  })

  it('rejeita quantidade negativa', () => {
    expect(solImportadaSchema.safeParse(solValida({ qtd: -1 })).success).toBe(false)
  })

  it('rejeita hospitalId fora de huv/mkr', () => {
    // @ts-expect-error testando valor inválido de propósito
    expect(solImportadaSchema.safeParse(solValida({ hospitalId: 'sp' })).success).toBe(false)
  })

  it('aceita motivo/solicitante vazios (campos preenchidos depois manualmente)', () => {
    expect(solImportadaSchema.safeParse(solValida({ motivo: '', solicitante: '' })).success).toBe(true)
  })
})

describe('vinculoAcompSchema', () => {
  function vinculoValido(overrides: Partial<VinculoAcomp> = {}): VinculoAcomp {
    return {
      ocId: 78842,
      solicitacaoId: 54321,
      dataOC: '01/09/2026',
      fornecedorNome: 'FORNECEDOR TESTE LTDA',
      ...overrides,
    }
  }

  it('aceita um vínculo bem formado', () => {
    expect(vinculoAcompSchema.safeParse(vinculoValido()).success).toBe(true)
  })

  it('rejeita ocId ou solicitacaoId não positivos', () => {
    expect(vinculoAcompSchema.safeParse(vinculoValido({ ocId: 0 })).success).toBe(false)
    expect(vinculoAcompSchema.safeParse(vinculoValido({ solicitacaoId: -1 })).success).toBe(false)
  })
})
