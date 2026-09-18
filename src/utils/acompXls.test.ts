import { describe, expect, it } from 'vitest'
import { parseAcompXLS } from './acompXls'

/**
 * Linhas sintéticas reproduzindo a estrutura real de um export "Acompanhamento
 * de Compras" em .xls que o Everton mandou em 18/09/2026 — não é o arquivo
 * real, só a mesma forma: cabeçalho da solicitação só na primeira página,
 * linha em branco entre cada OC, quebra de página no meio da lista (rodapé
 * com data/hora, sem repetir o cabeçalho da solicitação).
 */
function linha(...celulas: string[]): string[] {
  return celulas
}

describe('parseAcompXLS', () => {
  it('extrai o vínculo OC↔Solicitação de linhas com colunas espaçadas', () => {
    const linhas = [
      linha('', '', 'Solicitação de Compra:', '', '', '', '25915', '', 'Data da Solicitação:', '', '31/08/2026'),
      linha('', '', '', '', 'Ord. Com.', '', '', 'Dt. Ord. Com.', '', '', '', 'Fornecedor'),
      linha('', '', '', '', '79022', '', '', '03/09/2026', '', '', '', 'STAR MEDICAL', '', '', '74781', '', '', '16/09/2026'),
      linha(),
      linha('', '', '', '', '79026', '', '', '03/09/2026', '', '', '', 'URGENCIA HOSPITALAR', '', '', '74072', '', '', '08/09/2026'),
    ]

    const vinculos = parseAcompXLS(linhas)

    expect(vinculos).toEqual([
      { ocId: 79022, solicitacaoId: 25915, dataOC: '03/09/2026', fornecedorNome: 'STAR MEDICAL' },
      { ocId: 79026, solicitacaoId: 25915, dataOC: '03/09/2026', fornecedorNome: 'URGENCIA HOSPITALAR' },
    ])
  })

  it('mantém a solicitação atual através de quebra de página sem cabeçalho repetido', () => {
    const linhas = [
      linha('Solicitação de Compra:', '25915'),
      linha('79022', '03/09/2026', 'STAR MEDICAL'),
      linha(), // linha em branco
      linha('18/09/2026', '15:18'), // rodapé de página, sem OC de 5 dígitos
      linha(), // página nova, sem repetir o cabeçalho da solicitação
      linha('79050', '03/09/2026', 'SUPERMED COMERCIO 41'),
    ]

    const vinculos = parseAcompXLS(linhas)

    expect(vinculos).toEqual([
      { ocId: 79022, solicitacaoId: 25915, dataOC: '03/09/2026', fornecedorNome: 'STAR MEDICAL' },
      { ocId: 79050, solicitacaoId: 25915, dataOC: '03/09/2026', fornecedorNome: 'SUPERMED COMERCIO 41' },
    ])
  })

  it('ignora linhas antes de qualquer cabeçalho de solicitação', () => {
    const linhas = [linha('79022', '03/09/2026', 'STAR MEDICAL'), linha('Solicitação de Compra:', '25915')]
    expect(parseAcompXLS(linhas)).toEqual([])
  })

  it('ignora números de 5 dígitos fora da faixa de OC (60000-99999)', () => {
    const linhas = [linha('Solicitação de Compra:', '25915'), linha('12345', '03/09/2026', 'FORNECEDOR X')]
    expect(parseAcompXLS(linhas)).toEqual([])
  })

  it('ignora linha de OC sem nenhuma data reconhecível', () => {
    const linhas = [linha('Solicitação de Compra:', '25915'), linha('79022', 'sem data aqui', 'FORNECEDOR X')]
    expect(parseAcompXLS(linhas)).toEqual([])
  })
})
