type KpiTone = 'blue' | 'red' | 'amber' | 'green' | 'gray'

const BORDER_CLASS: Record<KpiTone, string> = {
  blue: 'border-l-status-blue',
  red: 'border-l-status-red',
  amber: 'border-l-status-amber',
  green: 'border-l-status-green',
  gray: 'border-l-status-gray',
}

const VALUE_CLASS: Record<KpiTone, string> = {
  blue: 'text-status-blue',
  red: 'text-status-red',
  amber: 'text-status-amber',
  green: 'text-status-green',
  gray: 'text-status-gray',
}

interface KpiCardProps {
  label: string
  value: number | string
  sub?: string
  tone?: KpiTone
  active?: boolean
  onClick?: () => void
}

export function KpiCard({ label, value, sub, tone = 'gray', active, onClick }: KpiCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-lg border border-slate-200 border-l-4 bg-white p-4 text-left shadow-sm transition-transform ${BORDER_CLASS[tone]} ${
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : ''
      } ${active ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
    >
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`font-mono text-3xl font-bold ${VALUE_CLASS[tone]}`}>{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </Tag>
  )
}
