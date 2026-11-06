import { OTIF_META } from '@/constants'

/** Filtros e tons compartilhados pelas telas de desempenho de entrega (OTIF). */

export const PERIODOS_ENTREGA = [
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 180 dias' },
  { value: '365', label: 'Últimos 12 meses' },
  { value: 'tudo', label: 'Todo o período' },
] as const

export type PeriodoEntrega = (typeof PERIODOS_ENTREGA)[number]['value']

/** Tom do KPI por percentual: verde na meta, âmbar até 75%, vermelho abaixo. */
export function tomPct(v: number | null): 'green' | 'amber' | 'red' | 'gray' {
  if (v === null) return 'gray'
  if (v >= OTIF_META) return 'green'
  if (v >= 0.75) return 'amber'
  return 'red'
}
