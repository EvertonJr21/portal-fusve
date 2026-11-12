import { NavLink } from 'react-router-dom'
import { HospitalSwitch } from '@/components/ui/HospitalSwitch'
import { useResumoDia } from '@/hooks/useResumoDia'
import type { ModuloNav } from './navegacao'

/**
 * Menu do módulo (item 101): título, descrição, seletor de hospital (só nos
 * módulos que dependem dele) e as páginas do módulo. Some no celular
 * (lá as páginas viram abas, `AbasModulo`).
 */
export function MenuModulo({ modulo }: { modulo: ModuloNav }) {
  const { contadores } = useResumoDia()
  const contador = contadores[modulo.chave]
  return (
    <>
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200/80 bg-white md:flex">
        <div className="flex flex-col gap-1 px-5 pt-5 pb-4">
          <h2 className="text-base font-bold tracking-tight text-slate-900">{modulo.titulo}</h2>
          <p className="text-xs leading-relaxed text-slate-500">{modulo.descricao}</p>
          {modulo.porHospital && (
            <div className="mt-3">
              <HospitalSwitch />
            </div>
          )}
        </div>
        <nav aria-label={modulo.titulo} className="flex flex-col gap-4 px-3 pb-6">
          {modulo.grupos.map((g, i) => (
            <div key={g.titulo ?? i} className="flex flex-col gap-0.5">
              {g.titulo && (
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.titulo}</p>
              )}
              {g.paginas.map((p) => (
                <NavLink
                  key={p.to}
                  to={p.to}
                  end={p.exato}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                      isActive ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <span className="truncate">{p.rotulo}</span>
                  {p.contador && contador > 0 && (
                    <span className="rounded-full bg-status-red-bg px-1.5 text-[11px] font-semibold text-status-red">{contador}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

    </>
  )
}

/** Páginas do módulo como abas, só no celular (o menu lateral some ali). */
export function AbasModulo({ modulo }: { modulo: ModuloNav }) {
  const paginas = modulo.grupos.flatMap((g) => g.paginas)
  return (
    <>
      {paginas.length > 1 && (
        <nav
          aria-label={modulo.titulo}
          className="flex gap-1 overflow-x-auto border-b border-slate-200/80 bg-white px-3 py-2 md:hidden"
        >
          {paginas.map((p) => (
            <NavLink
              key={p.to}
              to={p.to}
              end={p.exato}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`
              }
            >
              {p.rotulo}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  )
}
