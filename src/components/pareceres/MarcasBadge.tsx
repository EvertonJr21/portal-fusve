import type { MarcaCategoria } from '@/types'

const TONE_CLASS: Record<MarcaCategoria, string> = {
  padrao: 'bg-status-blue-bg text-status-blue',
  permitidas: 'bg-status-green-bg text-status-green',
  restritas: 'bg-status-amber-bg text-status-amber',
  proibidas: 'bg-status-red-bg text-status-red',
}

const ICONE: Partial<Record<MarcaCategoria, string>> = {
  restritas: '⚠ ',
  proibidas: '🚫 ',
}

interface MarcasBadgeProps {
  marcas: string[]
  categoria: MarcaCategoria
}

export function MarcasBadge({ marcas, categoria }: MarcasBadgeProps) {
  if (!marcas.length) return <span className="text-xs text-slate-300">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {marcas.map((m) => (
        <span key={m} className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${TONE_CLASS[categoria]}`}>
          {ICONE[categoria] ?? ''}
          {m}
        </span>
      ))}
    </div>
  )
}
