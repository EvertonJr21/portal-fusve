import { describe, expect, it } from 'vitest'
import { avaliarHospitalDoArquivo, mensagemErro } from './importacaoHospital'

describe('avaliarHospitalDoArquivo', () => {
  it('arquivo do outro hospital: maioria dos conhecidos está lá', () => {
    const r = avaliarHospitalDoArquivo(0, new Map([[1, 'huv'], [2, 'huv']]), 'mkr')
    expect(r.arquivoEhDeOutro).toBe(true)
    expect(r.outroHospital).toBe('huv')
    expect(r.deOutro.size).toBe(2)
  })
  it('poucas OCs do outro hospital no meio de um arquivo do ativo: não aborta', () => {
    const r = avaliarHospitalDoArquivo(50, new Map([[1, 'huv']]), 'mkr')
    expect(r.arquivoEhDeOutro).toBe(false)
    expect(r.deOutro.has(1)).toBe(true)
  })
  it('nada encontrado fora do ativo', () => {
    const r = avaliarHospitalDoArquivo(10, new Map(), 'huv')
    expect(r).toMatchObject({ arquivoEhDeOutro: false, outroHospital: null })
  })
})

describe('mensagemErro', () => {
  it('lê o objeto de erro do Supabase em vez de [object Object]', () => {
    expect(mensagemErro({ message: 'falhou', code: 'X', details: '' })).toBe('falhou')
    expect(mensagemErro({ code: '23505', message: 'duplicate key' })).toMatch(/outro hospital/)
    expect(mensagemErro(new Error('a'))).toBe('a')
    expect(mensagemErro(null)).toBe('Erro desconhecido')
  })
})
