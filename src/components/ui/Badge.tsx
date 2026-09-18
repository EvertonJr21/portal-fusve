import type { ReactNode } from 'react'

type BadgeTone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'purple'

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-status-gray-bg text-status-gray',
  blue: 'bg-status-blue-bg text-status-blue',
  green: 'bg-status-green-bg text-status-green',
  amber: 'bg-status-amber-bg text-status-amber',
  red: 'bg-status-red-bg text-status-red',
  purple: 'bg-status-purple-bg text-status-purple',
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  )
}
