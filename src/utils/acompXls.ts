import type { VinculoAcomp } from './pdf'

/**
 * Parser do "Acompanhamento de Compras" em planilha (.xls/.xlsx) — alternativa
 * ao PDF (`pdf.ts`, `parseAcompPDF`). Pedido do Everton em 18/09/2026 depois
 * de o parser de PDF falhar (fornecedor vindo vazio) num relatório real —
 * a planilha tem cada valor numa célula própria, então não depende de
 * heurística de posição de texto como o PDF depende.
 *
 * ATENÇÃO — muda a nota de segurança de `exportar.ts`: aquele arquivo dizia
 * que o app nunca lê (`XLSX.read`) planilha de terceiro, só escreve. Isso não
 * é mais verdade — este parser lê o arquivo que o Everton exporta do SoulMV e
 * sobe aqui. Risco avaliado como baixo mesmo assim: é sempre o próprio
 * Everton subindo um arquivo que ele mesmo exportou do sistema da empresa,
 * nunca conteúdo de terceiro/remoto — não muda o modelo de ameaça de verdade
 * (autoataque não é o cenário que a CVE do `xlsx` cobre), mas registrar aqui
 * por transparência (ver também CLAUDE.md, seção do módulo OCs).
 *
 * Mesmo princípio de robustez do parser de CSV (`csv.ts`) e do PDF: busca por
 * padrão de conteúdo na célula, nunca índice fixo de coluna — layouts de
 * export do SoulMV variam.
 */

const RE_SOLICITACAO = /Solicita[çc][aã]o\s+de\s+Compra/i
const RE_OC_ID = /^\d{5}$/
const RE_DATA = /^\d{2}\/\d{2}\/\d{4}$/
const RE_INTEIRO = /^\d+$/

export async function extractXlsRows(file: File): Promise<string[][]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const workbook = XLSX.read(buf, { type: 'array' })
  const planilha = workbook.Sheets[workbook.SheetNames[0]]
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(planilha, { header: 1, raw: false, defval: '' })
  return linhas.map((linha) => linha.map((celula) => String(celula ?? '').trim()))
}

/**
 * Igual ao `parseAcompPDF`: o cabeçalho "Solicitação de Compra: NNNNN" só
 * aparece uma vez por página impressa — quando o relatório quebra de página
 * no meio da lista de OCs de uma mesma solicitação, as linhas seguintes não
 * repetem o cabeçalho. Por isso `solicitacaoAtual` nunca é resetado até achar
 * um cabeçalho novo, mesmo atravessando linhas de rodapé/página em branco.
 */
export function parseAcompXLS(linhas: string[][]): VinculoAcomp[] {
  const vinculos: VinculoAcomp[] = []
  let solicitacaoAtual: number | null = null

  for (const celulas of linhas) {
    const idxSolicitacao = celulas.findIndex((c) => RE_SOLICITACAO.test(c))
    if (idxSolicitacao !== -1) {
      const numero = celulas.slice(idxSolicitacao + 1).find((c) => /^\d{4,6}$/.test(c))
      if (numero) solicitacaoAtual = parseInt(numero, 10)
      continue
    }
    if (!solicitacaoAtual) continue

    const idxOc = celulas.findIndex((c) => RE_OC_ID.test(c))
    if (idxOc === -1) continue
    const ocId = parseInt(celulas[idxOc], 10)
    if (ocId < 60000 || ocId > 99999) continue

    const resto = celulas.slice(idxOc + 1)
    const dataOC = resto.find((c) => RE_DATA.test(c))
    if (!dataOC) continue

    const fornecedorNome = resto.find((c) => c && !RE_DATA.test(c) && !RE_INTEIRO.test(c)) ?? ''

    vinculos.push({ ocId, solicitacaoId: solicitacaoAtual, dataOC, fornecedorNome })
  }

  return vinculos
}
