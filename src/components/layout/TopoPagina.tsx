import { ChevronRight, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { HospitalSwitch } from '@/components/ui/HospitalSwitch'
import { MenuUsuario } from '@/components/ui/MenuUsuario'
import { EVENTO_ABRIR_PALETA } from '@/components/ui/PaletaComandos'
import { Sino } from '@/components/ui/Sino'
import { moduloDoCaminho, paginaDoCaminho } from './navegacao'

interface TopoPaginaProps {
  /** Caminho fixo quando a tela não é de um módulo (ex.: Admin). */
  titulo?: string
  /** Mostra o seletor de hospital no celular (o menu do módulo some no celular). */
  comHospital?: boolean
}

/**
 * Topo de cada tela (item 101): caminho "Módulo / Página" e a busca (Ctrl K).
 * No celular também traz o seletor de hospital, avisos e a conta, que no
 * computador ficam na barra de módulos e no menu do módulo.
 */
export function TopoPagina({ titulo, comHospital = false }: TopoPaginaProps) {
  const { pathname } = useLocation()
  const modulo = moduloDoCaminho(pathname)
  const pagina = modulo ? paginaDoCaminho(modulo, pathname) : undefined
  const abrirBusca = () => window.dispatchEvent(new Event(EVENTO_ABRIR_PALETA))

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-sm md:px-6">
      <Link to="/" className="shrink-0 text-sm font-extrabold tracking-tight text-blue-800 md:hidden">
        FUSVE
      </Link>
      <div className="flex-1 sm:hidden" />
      <nav aria-label="Caminho" className="hidden min-w-0 flex-1 items-center gap-1.5 text-sm sm:flex">
        {modulo ? (
          <>
            <Link to={modulo.inicio} className="hidden shrink-0 text-slate-500 hover:text-slate-800 sm:inline">
              {modulo.titulo}
            </Link>
            {pagina && (
              <>
                <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 sm:inline" />
                <span className="truncate font-semibold text-slate-800">{pagina.rotulo}</span>
              </>
            )}
            {!pagina && <span className="truncate font-semibold text-slate-800 sm:hidden">{modulo.titulo}</span>}
          </>
        ) : (
          titulo && <span className="truncate font-semibold text-slate-800">{titulo}</span>
        )}
      </nav>

      <button
        type="button"
        onClick={abrirBusca}
        title="Buscar em todo o portal (Ctrl+K)"
        className="hidden h-9 w-72 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 hover:border-slate-300 hover:bg-white md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 truncate text-left">Buscar no portal…</span>
        <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
      </button>

      <div className="flex shrink-0 items-center gap-1.5 md:hidden">
        {comHospital && <HospitalSwitch />}
        <button
          type="button"
          onClick={abrirBusca}
          aria-label="Buscar"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        >
          <Search className="h-5 w-5" />
        </button>
        <Sino />
        <MenuUsuario />
      </div>
    </header>
  )
}
