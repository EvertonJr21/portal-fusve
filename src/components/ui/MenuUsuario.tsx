import { iniciais } from '@/utils/usuario'
import { LogOut, Moon, Shield, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMeuPerfil } from '@/hooks/usePermissoes'
import { useTema } from '@/hooks/useTema'

/** Avatar com iniciais + menu (tema, admin, sair) — item 12 da revisão. */
interface MenuUsuarioProps {
  /** `barra`: avatar na barra escura de módulos, menu abre ao lado. `topo`: avatar no topo (celular). */
  variante?: 'barra' | 'topo'
}

export function MenuUsuario({ variante = 'topo' }: MenuUsuarioProps) {
  const { session, signOut } = useAuth()
  const { data: perfil } = useMeuPerfil()
  const { tema, alternar } = useTema()
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  const email = session?.user.email ?? ''
  const nome = perfil?.nome || email.split('@')[0]
  const itemClass = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        title={email}
        aria-label="Menu da conta"
        className={`flex items-center justify-center rounded-full text-xs font-bold hover:opacity-90 ${variante === 'barra' ? 'h-9 w-9 bg-claro text-marinho' : 'h-8 w-8 bg-huv text-white'}`}
      >
        {iniciais(perfil?.nome || email || '?')}
      </button>
      {aberto && (
        <div className={`absolute z-40 w-60 animate-scale-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft-lg ${variante === 'barra' ? 'bottom-0 left-full ml-3' : 'right-0 mt-2'}`}>
          <div className="border-b border-slate-100 px-3 py-2.5">
            <div className="truncate text-sm font-semibold text-slate-800">{nome}</div>
            <div className="truncate text-xs text-slate-400">{email}</div>
            {perfil?.role === 'admin' && <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-status-blue">Administrador</div>}
          </div>
          <button type="button" className={itemClass} onClick={alternar}>
            {tema === 'escuro' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
          </button>
          {perfil?.role === 'admin' && (
            <Link to="/admin" className={itemClass} onClick={() => setAberto(false)}>
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
          <button type="button" className={`${itemClass} border-t border-slate-100`} onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
