import { HospitalSwitch } from './HospitalSwitch'

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-sm font-semibold text-slate-800">Portal FUSVE — Compras</h1>
      <HospitalSwitch />
    </header>
  )
}
