export type StatusDotTone = 'danger' | 'warning' | 'success' | 'neutral' | 'info'

const TONE_CLASS: Record<StatusDotTone, string> = {
  danger: 'bg-status-red',
  warning: 'bg-status-amber',
  success: 'bg-status-green',
  neutral: 'bg-status-gray',
  info: 'bg-status-blue',
}

/**
 * Substitui o semáforo 🔴🟡🟢 redefinido de forma independente em vários lugares
 * (OCTable, FichaFornecedor) — bolinha de cor via CSS em vez de emoji, que renderiza
 * diferente por SO/navegador/fonte.
 */
export function StatusDot({ tone, label }: { tone: StatusDotTone; label?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${TONE_CLASS[tone]}`}
      title={label}
      role={label ? 'img' : undefined}
      aria-label={label}
    />
  )
}
