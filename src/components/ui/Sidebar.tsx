import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/ocs', label: 'Ordens de Compra' },
  { to: '/pareceres', label: 'Pareceres Técnicos' },
  { to: '/contratos', label: 'Contratos' },
]

export function Sidebar() {
  return (
    <nav className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
      <ul className="flex flex-col gap-1">
        {LINKS.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
