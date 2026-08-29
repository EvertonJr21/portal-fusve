import { Dashboard as DashboardOC } from '@/components/ocs/Dashboard'

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Central de Pendências</h2>
        <p className="text-sm text-slate-500">O que precisa da sua atenção agora</p>
      </div>
      <DashboardOC />
    </div>
  )
}
