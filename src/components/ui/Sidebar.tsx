import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

export interface NavItem {
  to: string
  label: string
  end?: boolean
}

interface SidebarProps {
  title: string
  items: NavItem[]
  emBreve?: { title: string; items: string[] }[]
}

const STORAGE_KEY = 'fusve:sidebarColapsada'

/** Sidebar de um módulo: link "voltar aos módulos" + navegação própria do módulo. */
export function Sidebar({ title, items, emBreve = [] }: SidebarProps) {
  const [colapsada, setColapsada] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')

  const alternar = () => {
    setColapsada((c) => {
      const novo = !c
      localStorage.setItem(STORAGE_KEY, novo ? '1' : '0')
      return novo
    })
  }

  if (colapsada) {
    return (
      <nav className="flex w-10 shrink-0 flex-col items-center border-r border-slate-200/80 bg-white py-4">
        <button
          type="button"
          onClick={alternar}
          title="Expandir menu"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          »
        </button>
      </nav>
    )
  }

  return (
    <nav className="w-56 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          ← Módulos
        </Link>
        <button
          type="button"
          onClick={alternar}
          title="Recolher menu"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          «
        </button>
      </div>
      <h2 className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</h2>
      <ul className="mb-4 flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative block rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-y-1.5 left-0 w-[3px] animate-scale-in rounded-full bg-blue-600" />
                  )}
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {emBreve.map((grupo) => (
        <div key={grupo.title} className="mb-4">
          <h2 className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {grupo.title}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {grupo.items.map((label) => (
              <li key={label}>
                <span className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-300">
                  {label}
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                    em breve
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
