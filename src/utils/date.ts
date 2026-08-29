/** Data de hoje com horas zeradas — nunca usar `new Date()` diretamente para comparar prazos. */
export function getHoje(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDias(data: Date, dias: number): Date {
  const r = new Date(data)
  r.setDate(r.getDate() + dias)
  return r
}

/** Converte string `DD/MM/YYYY` ou `YYYY-MM-DD` em Date. Retorna null se inválida. */
export function parseDMY(s: string | null | undefined): Date | null {
  if (!s) return null
  const str = String(s).trim()
  if (str.includes('/')) {
    const [d, m, y] = str.split('/')
    if (!d || !m || !y) return null
    return new Date(+y, +m - 1, +d)
  }
  if (str.includes('-')) {
    const p = str.split('-')
    if (p.length !== 3) return null
    return p[0].length === 4
      ? new Date(+p[0], +p[1] - 1, +p[2])
      : new Date(+p[2], +p[1] - 1, +p[0])
  }
  return null
}

/** Date → string `DD/MM/YYYY`. */
export function fmt(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString('pt-BR') : '—'
}

/** String `DD/MM/YYYY` → `YYYY-MM-DD`, para `input[type=date]`. */
export function toInput(s: string | null | undefined): string {
  const d = parseDMY(s)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** `YYYY-MM-DD` (de `input[type=date]`) → `DD/MM/YYYY`. Inverso de `toInput`. */
export function fromInput(s: string | null | undefined): string {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

const MS_POR_DIA = 86_400_000

/** Dias entre duas datas (b - a), truncado para baixo. */
export function diasEntre(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_POR_DIA)
}
