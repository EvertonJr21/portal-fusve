import { HospitalSwitch } from './HospitalSwitch'

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 shadow-soft-sm backdrop-blur-sm">
      <h1 className="text-sm font-semibold tracking-tight text-slate-800">Portal FUSVE — Compras</h1>
      <HospitalSwitch />
    </header>
  )
}
