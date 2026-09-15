import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseOCsCSV, parseSolsCSV } from './csv'

function fixture(nome: string): string {
  return readFileSync(path.resolve(import.meta.dirname, '../../tests/fixtures', nome), 'utf-8')
}

describe('parseOCsCSV', () => {
  // Bug real (31/08/2026): split ingênuo por vírgula quebrava valores decimais
  // entre aspas (ex: "748,80") ao meio, desalinhando as colunas seguintes e
  // fazendo diasAtraso sair errado (ex: 748 em vez de 3).
  it('não deixa um valor decimal entre aspas (vírgula brasileira) desalinhar as colunas seguintes', () => {
    const [oc] = parseOCsCSV(fixture('oc-layout-a.csv'))
    expect(oc.id).toBe(78842)
    expect(oc.previsaoForn).toBe('15/09/2026')
    expect(oc.diasAtraso).toBe(3)
    expect(oc.estoque).toBe('SUP TESTE A')
  })

  // Bug real (31/08/2026): o export do SoulMV varia o número de colunas entre
  // blocos — um formato tem uma coluna vazia a mais antes da previsão/dias em
  // atraso. Índices fixos só funcionavam num dos dois formatos; a busca por
  // padrão (1ª data = previsão, 1º inteiro puro depois dela = dias em atraso)
  // precisa funcionar nos dois.
  it('encontra previsão e dias em atraso mesmo com uma coluna extra deslocando o layout', () => {
    const [oc] = parseOCsCSV(fixture('oc-layout-b.csv'))
    expect(oc.id).toBe(78843)
    expect(oc.previsaoForn).toBe('16/09/2026')
    expect(oc.diasAtraso).toBe(5)
  })

  it('normaliza situação truncada pelo export (largura fixa de coluna)', () => {
    const [oc] = parseOCsCSV(fixture('oc-layout-b.csv'))
    // "Parcialmente Atendida" (21 chars) vem truncado como "Parcialmente Ate" (16)
    expect(oc.sit).toBe('Parcialmente Atendida')
  })

  it('associa a OC ao bloco "Estoque:" mais recente', () => {
    const ocs = parseOCsCSV(`${fixture('oc-layout-a.csv')}${fixture('oc-layout-b.csv')}`)
    expect(ocs).toHaveLength(2)
    expect(ocs[0].estoque).toBe('SUP TESTE A')
    expect(ocs[1].estoque).toBe('SUP TESTE B')
  })

  it('ignora linhas sem OC válida (cabeçalhos, linhas em branco)', () => {
    const ocs = parseOCsCSV('cabeçalho qualquer\n,,,,,,,,\n')
    expect(ocs).toHaveLength(0)
  })
})

describe('parseSolsCSV', () => {
  it('extrai id, data, produto, motivo, solicitante, qtd, situação e estoque de um bloco completo', () => {
    const [sol] = parseSolsCSV(fixture('solicitacoes.csv'), 'huv')
    expect(sol).toEqual({
      id: 54321,
      data: '15/08/2026',
      produto: 'SERINGA DESCARTAVEL 10ML',
      motivo: 'COMPRA NORMAL',
      solicitante: 'MARIA DA SILVA',
      qtd: 5,
      sit: 'Aberta',
      estoque: 'SUP TESTE',
      hospitalId: 'huv',
    })
  })

  it('marca produto não identificado como "(verificar no SoulMV)" em vez de inventar dado', () => {
    const texto = 'Solicitação:,,,99999,,\nData:,20/08/2026\n'
    const [sol] = parseSolsCSV(texto, 'mkr')
    expect(sol.produto).toBe('(verificar no SoulMV)')
    expect(sol.hospitalId).toBe('mkr')
  })
})
