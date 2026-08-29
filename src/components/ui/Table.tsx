import type { ReactNode, TableHTMLAttributes, ThHTMLAttributes } from 'react'

export function Table(props: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-max border-collapse text-sm" {...props} />
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="sticky top-0 bg-slate-50">{children}</thead>
}

export type SortDir = 1 | -1

interface SortableThProps<K extends string>
  extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'dir'> {
  sortKey?: K
  activeKey?: K | null
  sortDir?: SortDir
  onSort?: (key: K) => void
  children: ReactNode
}

export function SortableTh<K extends string>({
  sortKey,
  activeKey,
  sortDir,
  onSort,
  children,
  className = '',
  ...rest
}: SortableThProps<K>) {
  const sortable = sortKey && onSort
  const active = sortable && activeKey === sortKey
  const arrow = !sortable ? null : active ? (sortDir === 1 ? '↑' : '↓') : '↕'

  return (
    <th
      className={`px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 ${
        sortable ? 'cursor-pointer select-none hover:text-slate-700' : ''
      } ${active ? 'text-blue-700' : ''} ${className}`}
      onClick={sortable ? () => onSort(sortKey) : undefined}
      {...rest}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {arrow && <span className={active ? 'opacity-100' : 'opacity-35'}>{arrow}</span>}
      </span>
    </th>
  )
}
