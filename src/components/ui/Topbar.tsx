import { useAuth } from '@/hooks/useAuth'
import { HospitalSwitch } from './HospitalSwitch'

export function Topbar() {
  const { session, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 shadow-soft-sm backdrop-blur-sm">
      <h1 className="text-sm font-semibold tracking-tight text-slate-800">Portal FUSVE — Compras</h1>
      <div className="flex items-center gap-4">
        <HospitalSwitch />
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <span className="hidden text-xs text-slate-400 sm:inline">{session?.user.email}</span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
