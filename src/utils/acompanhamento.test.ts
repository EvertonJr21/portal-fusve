import { describe, expect, it } from 'vitest'
import { decodificarTexto, gradeDeXlsx, parseAcompanhamentoGrade, parseAcompanhamentoXml } from './acompanhamento'

/**
 * Fixtures sintéticas (fornecedores fictícios) com a mesma forma dos exports
 * reais do "Acompanhamento de Compras": cabeçalho de solicitação só na 1ª
 * página, colunas espaçadas, rodapé de página com data/hora.
 */
function linha(...celulas: string[]): string[] {
  return celulas
}

const CABECALHO = linha('', '', '', '', 'Ord. Com.', '', '', 'Dt. Ord. Com.', '', '', '', 'Dias Sol./Ord.:', '', '', '', 'Fornecedor', '', '', 'Entrada :', '', '', 'Dt. Entrada', '', '', 'Dias Ord./Entrada:')

function linhaOC(oc: string, data: string, dias: string, forn: string, entrada: string, dtEntrada: string, diasEnt: string): string[] {
  return linha('', '', '', '', oc, '', '', data, '', '', '', dias, '', '', '', forn, '', '', entrada, '', '', dtEntrada, '', '', diasEnt)
}

describe('parseAcompanhamentoGrade', () => {
  it('lê OC, solicitação e entrada pelas colunas do cabeçalho', () => {
    const ocs = parseAcompanhamentoGrade([
      linha('', '', 'Solicitação de Compra:', '', '', '', '26000', '', '', '', '', '', '', 'Data da Solicitação:', '', '', '01/11/2026'),
      CABECALHO,
      linhaOC('81001', '03/11/2026', '2', 'FORNECEDOR ALFA', '0', '', '0'),
      linhaOC('81002', '03/11/2026', '2', 'FORNECEDOR BETA', '70001', '05/11/2026', '2'),
    ])
    expect(ocs).toEqual([
      { ocId: 81001, dataOC: '03/11/2026', fornecedorNome: 'FORNECEDOR ALFA', solicitacaoId: 26000, dataSolicitacao: '01/11/2026', diasSolOrd: 2, entradas: [] },
      {
        ocId: 81002,
        dataOC: '03/11/2026',
        fornecedorNome: 'FORNECEDOR BETA',
        solicitacaoId: 26000,
        dataSolicitacao: '01/11/2026',
        diasSolOrd: 2,
        entradas: [{ numero: '70001', data: '05/11/2026' }],
      },
    ])
  })

  it('"Entrada 0" sem data não vira entrada', () => {
    const [oc] = parseAcompanhamentoGrade([CABECALHO, linhaOC('81001', '03/11/2026', '2', 'FORNECEDOR ALFA', '0', '', '0')])
    expect(oc.entradas).toEqual([])
  })

  it('ignora o rodapé de página e mantém a solicitação na página seguinte', () => {
    const ocs = parseAcompanhamentoGrade([
      linha('Solicitação de Compra:', '26000'),
      CABECALHO,
      linhaOC('81001', '03/11/2026', '2', 'FORNECEDOR ALFA', '0', '', '0'),
      linha('', '', '', '06/11/2026', '', '', '', '', '11:27'),
      linha('', 'Acompanhamento de Compras'),
      linhaOC('81050', '03/11/2026', '2', 'FORNECEDOR GAMA', '0', '', '0'),
    ])
    expect(ocs.map((o) => [o.ocId, o.solicitacaoId])).toEqual([
      [81001, 26000],
      [81050, 26000],
    ])
  })

  it('junta entradas fracionadas da mesma OC', () => {
    const [oc] = parseAcompanhamentoGrade([
      CABECALHO,
      linhaOC('81002', '03/11/2026', '2', 'FORNECEDOR BETA', '70001', '05/11/2026', '2'),
      linhaOC('', '', '', '', '70050', '12/11/2026', '9'),
    ])
    expect(oc.entradas).toEqual([
      { numero: '70001', data: '05/11/2026' },
      { numero: '70050', data: '12/11/2026' },
    ])
  })

  it('sem cabeçalho, cai pra busca por padrão de conteúdo', () => {
    const ocs = parseAcompanhamentoGrade([
      linha('Solicitação de Compra:', '25915'),
      linha('79022', '03/09/2026', 'FORNECEDOR DELTA', '74781', '16/09/2026'),
      linha('79026', '03/09/2026', 'FORNECEDOR EPSILON', '0'),
    ])
    expect(ocs.map((o) => [o.ocId, o.solicitacaoId, o.fornecedorNome, o.entradas.length])).toEqual([
      [79022, 25915, 'FORNECEDOR DELTA', 1],
      [79026, 25915, 'FORNECEDOR EPSILON', 0],
    ])
  })
})

describe('parseAcompanhamentoXml', () => {
  it('lê OC e entrada; não traz solicitação', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><Acompanhamento_de_Compras>
<Table1><TEXT2>81001</TEXT2><TEXT22>03/11/2026</TEXT22><TEXT8>2</TEXT8><TEXT1>FORNECEDOR ALFA</TEXT1><TEXT23>0</TEXT23><TEXT16/><TEXT11>0</TEXT11></Table1>
<Table1><TEXT2>81002</TEXT2><TEXT22>03/11/2026</TEXT22><TEXT8>2</TEXT8><TEXT1>ALFA &amp; BETA</TEXT1><TEXT23>70001</TEXT23><TEXT16>05/11/2026</TEXT16><TEXT11>2</TEXT11></Table1>
</Acompanhamento_de_Compras>`
    const ocs = parseAcompanhamentoXml(xml)
    expect(ocs.map((o) => [o.ocId, o.fornecedorNome, o.solicitacaoId, o.entradas])).toEqual([
      [81001, 'FORNECEDOR ALFA', null, []],
      [81002, 'ALFA & BETA', null, [{ numero: '70001', data: '05/11/2026' }]],
    ])
  })
})

describe('gradeDeXlsx', () => {
  function utf16be(texto: string): Uint8Array {
    const bytes = new Uint8Array(2 + texto.length * 2)
    bytes[0] = 0xfe
    bytes[1] = 0xff
    for (let i = 0; i < texto.length; i++) {
      bytes[2 + i * 2] = texto.charCodeAt(i) >> 8
      bytes[3 + i * 2] = texto.charCodeAt(i) & 0xff
    }
    return bytes
  }

  it('lê planilha com XML interno em UTF-16 (formato do MV), preservando colunas', () => {
    const arquivos: Record<string, Uint8Array> = {
      'xl/sharedStrings.xml': utf16be('<sst><si><t>Ord. Com.</t></si><si><t>FORNECEDOR ALFA</t></si></sst>'),
      'xl/worksheets/sheet1.xml': utf16be(
        '<worksheet><sheetData><row r="2"><c r="E2" t="s"><v>0</v></c></row>' +
          '<row r="4"><c r="E4"><v>81001</v></c><c r="P4" t="s"><v>1</v></c><c r="Q4"/></row></sheetData></worksheet>',
      ),
    }
    const grade = gradeDeXlsx({ ler: (c) => arquivos[c] ?? null })
    expect(grade[0][4]).toBe('Ord. Com.')
    expect(grade[1][4]).toBe('81001')
    expect(grade[1][15]).toBe('FORNECEDOR ALFA')
  })

  it('decodifica UTF-8 sem BOM', () => {
    expect(decodificarTexto(new TextEncoder().encode('ação'))).toBe('ação')
  })
})
