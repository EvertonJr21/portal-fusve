import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface TextItemLike {
  str: string
  width?: number
  transform: number[]
}

/** Reconstrói linhas visuais de uma página de PDF a partir dos itens de texto posicionados. */
async function extractPageLines(page: pdfjsLib.PDFPageProxy): Promise<string[]> {
  const content = await page.getTextContent()
  const items = (content.items as TextItemLike[]).filter((i) => 'transform' in i)

  const alturas = items.map((i) => Math.abs(i.transform[3] ?? 10))
  const alturaMediana = alturas.sort((a, b) => a - b)[Math.floor(alturas.length / 2)] ?? 10
  const tolerancia = Math.max(alturaMediana * 0.6, 4)

  const grupos: TextItemLike[][] = []
  let y: number | null = null
  let atual: TextItemLike[] = []
  for (const item of items) {
    const itemY = item.transform[5]
    if (y === null || Math.abs(itemY - y) > tolerancia) {
      if (atual.length) grupos.push(atual)
      atual = [item]
      y = itemY
    } else {
      atual.push(item)
    }
  }
  if (atual.length) grupos.push(atual)

  return grupos.map((grupo) => {
    const ordenado = [...grupo].sort((a, b) => a.transform[4] - b.transform[4])
    let linha = ''
    let fimAnterior = 0
    for (const item of ordenado) {
      const x = item.transform[4]
      if (fimAnterior > 0 && x - fimAnterior > 8) {
        linha += ' '.repeat(Math.max(1, Math.round((x - fimAnterior) / 5)))
      }
      linha += item.str
      fimAnterior = x + (item.width ?? 0)
    }
    return linha
  })
}

export async function extractPdfLines(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const linhas: string[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    linhas.push(...(await extractPageLines(page)))
  }
  return linhas
}

export interface VinculoAcomp {
  ocId: number
  solicitacaoId: number
  dataOC: string
  fornecedorNome: string
}

/**
 * Parser do PDF "Acompanhamento de Compras" — extrai o vínculo OC ↔ Solicitação.
 * Replica `parseAcomp` do legado; é o único fluxo de PDF portado nesta fase
 * porque não tem equivalente em CSV (CSV já cobre a ingestão de OCs/Solicitações).
 */
export function parseAcompPDF(lines: string[]): VinculoAcomp[] {
  const vinculos: VinculoAcomp[] = []
  let solicitacaoAtual: number | null = null

  const reSolicitacao = /Solicitaç[aã]o\s+de\s+Compra[:\s]+(\d{4,6})/i

  for (const linha of lines) {
    const mSol = reSolicitacao.exec(linha)
    if (mSol) {
      solicitacaoAtual = parseInt(mSol[1], 10)
      continue
    }
    if (!solicitacaoAtual) continue

    const primeiroToken = linha.trim().split(/\s+/)[0]
    if (!/^\d{5}$/.test(primeiroToken)) continue
    const ocId = parseInt(primeiroToken, 10)
    if (ocId < 60000 || ocId > 99999) continue

    const datas = linha.match(/\d{2}\/\d{2}\/\d{4}/g)
    if (!datas || !datas.length) continue
    const dataOC = datas[0]

    const fornecedorNome = linha
      .substring(primeiroToken.length)
      .split(dataOC)[0]
      .trim()
      .replace(/\s+\d+\s*$/, '')
      .trim()

    vinculos.push({ ocId, solicitacaoId: solicitacaoAtual, dataOC, fornecedorNome })
  }

  return vinculos
}
