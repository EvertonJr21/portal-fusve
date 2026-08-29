export interface BionexoMeta {
  solicitacao?: string
  idCotacao?: string
  tipo?: string
  dataCriacao?: string
  vencimento?: string
  comprador?: string
  hospital?: string
}

export interface BionexoItem {
  num: number
  cod: string
  desc: string
  un: string
  qty: number
  qtyFmt: string
}

export interface BionexoResultado {
  meta: BionexoMeta
  itens: BionexoItem[]
}

/**
 * Parser do texto extraído (via pdf.js) de uma cotação Bionexo.
 * Porta `parseBionexoText` de `_legacy/parecer/.../js/engine.js` quase 1:1 —
 * é lógica pura de regex sobre texto, sem DOM.
 */
export function parseBionexoText(fullText: string): BionexoResultado {
  const lines = fullText.split('\n')
  const meta: BionexoMeta = {}
  const itens: BionexoItem[] = []
  let itemNum = 0

  for (const line of lines) {
    const mSol = line.match(/Solic[iu]ta[cç][aã]o N\.\s*(\d+)/)
    if (mSol) meta.solicitacao = mSol[1]
    const mId = line.match(/ID:\s*(\d+)/)
    if (mId) meta.idCotacao = mId[1]
    const mTipo = line.match(/Tipo de cota[cç][aã]o:\s*([^\s][^\t]+?)(?:\s{3,}|$)/)
    if (mTipo) meta.tipo = mTipo[1].trim()
    const mDatas = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/)
    if (mDatas) {
      meta.dataCriacao = mDatas[1]
      meta.vencimento = mDatas[2]
    }
    const mComp = line.match(/Comprador:\s*(.+?)$/)
    if (mComp) meta.comprador = mComp[1].trim()
    const mHosp = line.match(/\b(HMK|HUV)\b/)
    if (mHosp) meta.hospital = mHosp[1]
  }

  const itemRe =
    /^(\d{4,6})\s{2,}(.+?)\s{1,}(Unidade|Frasco|Litro|un|KIT|Kit|Caixa|CAIXA|Metro|PAR|Par|Ampola|Comprimido|ml|ML|g|G|kg|KG|L)\s{2,}([\d.,]+)\s+Para\s+an[aá]lise/i
  const fallbackRe = /^(\d{4,6})\s{2,}(.+?)\s{2,}([\d.,]+)\s+Para\s+an[aá]lise/
  const contRe = /^\s{5,}\S/

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].replace(/^\s+/, '')
    const m = itemRe.exec(stripped)
    let cod: string, desc: string, un: string, qtyRaw: string

    if (m) {
      cod = m[1]
      desc = m[2].trim()
      un = m[3].trim()
      qtyRaw = m[4]
    } else {
      const m2 = fallbackRe.exec(stripped)
      if (!m2) continue
      cod = m2[1]
      desc = m2[2].trim()
      un = ''
      qtyRaw = m2[3]
    }

    const nextLine = lines[i + 1]
    if (
      nextLine &&
      contRe.test(nextLine) &&
      !/^\s*\d{4,6}\s/.test(nextLine) &&
      !/Para an[aá]lise/.test(nextLine) &&
      !/Cota[cç][aã]o \d/.test(nextLine)
    ) {
      desc = desc + ' ' + nextLine.trim()
      i++
    }

    const qty = parseFloat(qtyRaw.replace(/\./g, '').replace(',', '.')) || 0

    itemNum++
    itens.push({ num: itemNum, cod, desc, un, qty, qtyFmt: qtyRaw })
  }

  return { meta, itens }
}

/** Parser de fallback pra entrada manual: código, descrição, unidade e qtd separados por tab ou 2+ espaços. */
export function parseItensManual(texto: string): BionexoItem[] {
  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2)

  const itens: BionexoItem[] = []
  linhas.forEach((linha, i) => {
    const parts = linha
      .split(/\s{2,}|\t/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (!parts.length) return
    const cod = parts[0]
    if (!/^\d+$/.test(cod)) return
    const desc = parts[1] ?? ''
    const un = parts[2] ?? ''
    const qty = parts[3] ? parseFloat(parts[3]) || 0 : 0
    itens.push({ num: i + 1, cod, desc, un, qty, qtyFmt: String(qty) })
  })
  return itens
}
