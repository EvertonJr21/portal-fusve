import { describe, expect, it } from 'vitest'
import { parseFornecedoresCSV } from './fornecedoresCsv'

/**
 * Fixture sintética no formato do relatório real `R_FORNEC.csv` do SoulMV —
 * não é o arquivo real do Everton. Bloco de 7 linhas por fornecedor (varia
 * 4-10 no arquivo real), com CNPJ na 2ª linha do bloco.
 */
function bloco(id: number, nome: string, cnpj: string | null): string {
  return [
    `,,Fornecedor:,,,${id},,,${nome},,Fantasia:,,,CNPJ,,,,,`,
    `,,,,,,,,,,, ${nome.slice(0, 10)},,,,${cnpj ?? ''},,,`,
    `,,,Endereço:,,,RUA TESTE,,,Bairro:,,CENTRO,Cidade:,,,VASSOURAS,,CEP:,27700000`,
    `,,,,Contato:,,, ,,,,,,,,,,,`,
    `,,,,,,,,,,,,,,Código CNAE:,,,,`,
    `Fornecedor:,,,,,,,,,,,,,,,,,,`,
    `,Forma de Comunic.:,,,,,,,,,,,,,,,,,`,
  ].join('\n')
}

describe('parseFornecedoresCSV', () => {
  it('extrai id, nome e cnpj de um bloco válido', () => {
    const texto = bloco(11925, 'CORDIS MEDICAL BRASIL LTDA', '27.548.227/0002-03')
    const r = parseFornecedoresCSV(texto)
    expect(r).toEqual([{ id: 11925, nome: 'CORDIS MEDICAL BRASIL LTDA', cnpj: '27.548.227/0002-03' }])
  })

  it('processa múltiplos blocos seguidos', () => {
    const texto = [bloco(1, 'FORNECEDOR UM', '11.111.111/0001-11'), bloco(2, 'FORNECEDOR DOIS', '22.222.222/0001-22')].join('\n')
    const r = parseFornecedoresCSV(texto)
    expect(r).toHaveLength(2)
    expect(r.map((f) => f.id)).toEqual([1, 2])
  })

  it('cnpj null quando o fornecedor não tem CNPJ no relatório (pessoa física, etc.)', () => {
    const texto = bloco(3, 'FULANO DE TAL', null)
    const r = parseFornecedoresCSV(texto)
    expect(r[0].cnpj).toBeNull()
  })

  it('remove espaço em branco extra do nome (campo de largura fixa do relatório)', () => {
    const texto = bloco(4, '  A S GONTIJO ARTIGOS RECREATIVOS LT  ', '33.674.019/0001-72')
    const r = parseFornecedoresCSV(texto)
    expect(r[0].nome).toBe('A S GONTIJO ARTIGOS RECREATIVOS LT')
  })

  it('deduplica blocos repetidos com o mesmo id (achado real no arquivo do Everton)', () => {
    const texto = [bloco(1907, 'DESK MOVEIS ESCOLARES', '74.148.958/0001-60'), bloco(1907, 'DESK MOVEIS ESCOLARES', '74.148.958/0001-60')].join(
      '\n',
    )
    const r = parseFornecedoresCSV(texto)
    expect(r).toHaveLength(1)
  })

  it('tolera blocos com mais linhas que o padrão (Forma de Comunic./CNAE com múltiplas entradas)', () => {
    const texto = [
      `,,Fornecedor:,,,20259,,,BIOMEDICAL SP,,Fantasia:,,,CNPJ,,,,,`,
      `,,,,,,,,,,, BIOMEDICAL,,,,12.345.678/0001-90,,,`,
      `,,,Endereço:,,,RUA X,,,Bairro:,,B,Cidade:,,,SAO PAULO,,CEP:,01000000`,
      `,,,,Contato:,,, ,,,,,,,,,,,`,
      `,,,,,,,,,,,,,,Código CNAE:,,,,`,
      `,,,,,,,,,,,,,,Código CNAE:,,,,`, // linha extra de CNAE
      `Fornecedor:,,,,,,,,,,,,,,,,,,`,
      `,Forma de Comunic.:,,,,,,,,,,,,,,,,,`,
      `,Forma de Comunic.:,,,,,,,,,,,,,,,,,`, // linha extra de comunicação
    ].join('\n')
    const r = parseFornecedoresCSV(texto)
    expect(r).toEqual([{ id: 20259, nome: 'BIOMEDICAL SP', cnpj: '12.345.678/0001-90' }])
  })

  it('retorna array vazio pra texto sem nenhum bloco de fornecedor', () => {
    expect(parseFornecedoresCSV('linha qualquer\noutra linha')).toEqual([])
  })
})
