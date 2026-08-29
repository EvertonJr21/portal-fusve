import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const GRUPOS: NavGroup[] = [
  {
    title: 'Ordens de Compra',
    items: [
      { to: '/ocs', label: 'Central de Pendências' },
      { to: '/ocs/ordens', label: 'Ordens de Compra' },
    ],
  },
  {
    title: 'Outros módulos',
    items: [
      { to: '/pareceres', label: 'Pareceres Técnicos' },
      { to: '/contratos', label: 'Contratos' },
    ],
  },
]

const EM_BREVE: NavGroup[] = [
  { title: 'Fornecedores', items: [{ to: '#', label: 'Por Fornecedor' }, { to: '#', label: 'Cadastro' }] },
  { title: 'Análise', items: [{ to: '#', label: 'Métricas' }] },
  {
    title: 'Sistema',
    items: [
      { to: '#', label: 'Solicitações' },
      { to: '#', label: 'Resumo Diário' },
      { to: '#', label: 'Importar PDF' },
      { to: '#', label: 'Backup' },
    ],
  },
]

export function Sidebar() {
  return (
    <nav className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
      {GRUPOS.map((grupo) => (
        <div key={grupo.title} className="mb-4">
          <h2 className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {grupo.title}
          </h2>
          <ul className="flex flex-col gap-1">
            {grupo.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/ocs'}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {EM_BREVE.map((grupo) => (
        <div key={grupo.title} className="mb-4">
          <h2 className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {grupo.title}
          </h2>
          <ul className="flex flex-col gap-1">
            {grupo.items.map((item) => (
              <li key={item.label}>
                <span className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-slate-300">
                  {item.label}
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
