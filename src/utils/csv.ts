import { SITUACOES_OC, type HospitalId } from '@/constants'

/** Lê um arquivo tentando UTF-8; se inválido, cai para latin-1 (padrão dos exports do SoulMV). */
export async function decodeFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('iso-8859-1').decode(buf)
  }
}

/**
 * Split de linha CSV respeitando campos entre aspas — necessário porque os
 * exports do SoulMV usam vírgula como separador decimal em valores (ex:
 * "748,80"), e o Excel escapa esses campos entre aspas. Um split ingênuo por
 * vírgula quebra esses campos ao meio e desalinha as colunas seguintes.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let atual = ''
  let entreAspas = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      entreAspas = !entreAspas
    } else if (c === ',' && !entreAspas) {
      result.push(atual.trim())
      atual = ''
    } else {
      atual += c
    }
  }
  result.push(atual.trim())
  return result
}

/**
 * O export do SoulMV trunca a situação em campo de largura fixa — "Parcialmente
 * Atendida" (21 caracteres) vira "Parcialmente Ate" (16). Normaliza pelo prefixo
 * contra a lista canônica em vez de comparar string exata, senão `SIT_RANK` não
 * reconhece o valor truncado e a OC nunca avança de "Autorizada" pra "Parcialmente
 * Atendida" na importação.
 */
function normalizeSit(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return 'Autorizada'
  const match = SITUACOES_OC.find((s) => s === trimmed || s.startsWith(trimmed))
  return match ?? trimmed
}

export interface OCImportada {
  id: number
  dataSolic: string
  sit: string
  fornecedorId: number
  fornecedorNome: string
  previsaoForn: string | null
  diasAtraso: number
  estoque: string
}

/** Parser de `R_ORD_COM_FOR.csv` — replica `parseOCsCSV` do legado. */
export function parseOCsCSV(text: string): OCImportada[] {
  const linhas = text.split(/\r?\n/)
  const itens: OCImportada[] = []
  let estoqueAtual = ''

  for (const linha of linhas) {
    const cols = splitCsvLine(linha)
    if (cols[0] === 'Estoque:') {
      estoqueAtual = cols.slice(4).filter(Boolean).join(' ').trim()
      continue
    }
    if (cols[0] !== '' || !/^\d{4,6}$/.test(cols[1] ?? '') || !/\d{2}\/\d{2}\/\d{4}/.test(cols[3] ?? '')) continue

    const fornNome = (cols[7] ?? '').trim()
    if (fornNome.length < 2) continue

    // Dt. Prevista e dias em atraso vêm depois do nome do fornecedor, mas a posição
    // exata varia entre blocos do mesmo arquivo (alguns têm uma coluna extra vazia
    // antes de "Tipo Pagamento") — busca por padrão em vez de índice fixo.
    const cauda = cols.slice(8)
    const dtPrevIdx = cauda.findIndex((c) => /^\d{2}\/\d{2}\/\d{4}$/.test(c))
    const dtPrev = dtPrevIdx >= 0 ? cauda[dtPrevIdx] : null
    const diasAtrasoStr = dtPrevIdx >= 0 ? cauda.slice(dtPrevIdx + 1).find((c) => /^\d+$/.test(c)) : undefined

    itens.push({
      id: parseInt(cols[1], 10),
      dataSolic: cols[3],
      sit: normalizeSit(cols[5] ?? ''),
      fornecedorId: parseInt(cols[6], 10) || 0,
      fornecedorNome: fornNome,
      previsaoForn: dtPrev,
      diasAtraso: parseInt(diasAtrasoStr ?? '', 10) || 0,
      estoque: estoqueAtual,
    })
  }
  return itens
}

export interface SolImportada {
  id: number
  data: string
  produto: string
  motivo: string
  solicitante: string
  qtd: number
  sit: string
  estoque: string
  hospitalId: HospitalId
}

const SITUACOES_VALIDAS = ['Aberta', 'Fechada', 'Cancelada', 'Parcialmente Atendida']

/** Parser de `R_SOL_PEND_DATA.csv` — replica `parseSolsCSV` do legado (bloco por solicitação). */
export function parseSolsCSV(text: string, hospitalId: HospitalId): SolImportada[] {
  const linhas = text.split(/\r?\n/)
  const itens: SolImportada[] = []
  let cur: Partial<SolImportada> | null = null

  const salvar = () => {
    if (cur?.id && cur.data) {
      itens.push({
        id: cur.id,
        data: cur.data,
        produto: cur.produto && cur.produto.length >= 3 ? cur.produto : '(verificar no SoulMV)',
        motivo: cur.motivo ?? '',
        solicitante: cur.solicitante ?? '',
        qtd: cur.qtd ?? 1,
        sit: cur.sit ?? 'Aberta',
        estoque: cur.estoque ?? '',
        hospitalId,
      })
    }
    cur = null
  }

  for (const linha of linhas) {
    const parts = splitCsvLine(linha)
    const raw = linha

    if (raw.includes('Solicitaç') || raw.includes('Solicitacao')) {
      salvar()
      const idx = parts.findIndex((p) => /^Solicitaç/i.test(p) || /^Solicitacao/i.test(p))
      const id = parts.slice(idx + 1, idx + 6).find((p) => /^\d{4,6}$/.test(p))
      cur = { id: id ? parseInt(id, 10) : undefined }
      continue
    }
    if (!cur) continue

    if (!cur.data && parts.includes('Data:')) {
      const i = parts.indexOf('Data:')
      const d = parts.slice(i + 1).find((p) => /^\d{2}\/\d{2}\/\d{4}$/.test(p))
      if (d) cur.data = d
    }
    if (!cur.motivo) {
      const i = parts.findIndex((p) => p === 'Motivo do Pedido:')
      if (i >= 0) {
        const m = parts.slice(i + 1, i + 8).find((p) => p.length > 2 && !/^\d+$/.test(p))
        if (m) cur.motivo = m
      }
    }
    if (!cur.solicitante && parts[0] === 'Solicitante:') {
      const s = parts.slice(1, 10).find((p) => p.length > 2 && !/^(FUSVE|HUV|HMK|HOSPITAL)/i.test(p) && !/^\d+$/.test(p))
      if (s) cur.solicitante = s
    }
    if (!cur.estoque) {
      const i = parts.findIndex((p) => p === 'Estoque:')
      if (i >= 0) {
        const e = parts.slice(i + 2, i + 6).find((p) => p.length > 3 && !/^\d+$/.test(p))
        if (e) cur.estoque = e
      }
    }
    if ((parts[0] === 'Situação:' || parts[0] === 'Situacao:') && !cur.sit) {
      const s = parts.find((p) => SITUACOES_VALIDAS.includes(p))
      cur.sit = s ?? 'Aberta'
    }
    if (!cur.produto && parts[0] === '' && /^\d{4,6}$/.test(parts[1] ?? '') && (parts[4]?.length ?? 0) > 3) {
      cur.produto = parts[4]
      const qtdReversa = [...parts.slice(10)].reverse().find((p) => /^\d+$/.test(p) && parseInt(p, 10) > 0)
      if (qtdReversa) cur.qtd = parseInt(qtdReversa, 10)
    }
  }
  salvar()
  return itens
}
