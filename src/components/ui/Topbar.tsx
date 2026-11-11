import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HospitalSwitch } from './HospitalSwitch'
import { MenuUsuario } from './MenuUsuario'
import { EVENTO_ABRIR_PALETA } from './PaletaComandos'
import { Sino } from './Sino'

export function Topbar() {
  const abrirBusca = () => window.dispatchEvent(new Event(EVENTO_ABRIR_PALETA))

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/90 px-3 shadow-soft-sm backdrop-blur-sm md:px-6">
      <Link to="/" title="Início — resumo do dia" className="shrink-0 text-sm font-semibold tracking-tight text-slate-800 hover:text-slate-950">
        <span className="hidden sm:inline">Portal FUSVE — Compras</span>
        <span className="sm:hidden">FUSVE</span>
      </Link>

      <button
        type="button"
        onClick={abrirBusca}
        title="Buscar em todo o portal (Ctrl+K)"
        className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 hover:border-slate-300 hover:bg-white md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar OC, fornecedor, contrato…</span>
        <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
      </button>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={abrirBusca}
          aria-label="Buscar"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <Search className="h-5 w-5" />
        </button>
        <HospitalSwitch />
        <Sino />
        <MenuUsuario />
      </div>
    </header>
  )
}
