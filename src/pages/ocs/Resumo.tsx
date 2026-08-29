import { Link } from 'react-router-dom'
import { FINAL_SIT } from '@/constants'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { getHoje, parseDMY } from '@/utils/date'
import { statusPrazo } from '@/utils/oc'

function contarPorStatus<T>(items: T[], sit: (i: T) => string, data: (i: T) => Date | null) {
  const vencidas = items.filter((i) => statusPrazo(data(i), sit(i)) === 'vencida').length
  const urgentes = items.filter((i) => statusPrazo(data(i), sit(i)) === 'urgente').length
  const noPrazo = items.filter((i) => statusPrazo(data(i), sit(i)) === 'ok').length
  return { vencidas, urgentes, noPrazo }
}

function Cartao({ label, valor, tone, to }: { label: string; valor: number; tone: 'red' | 'amber' | 'gray'; to: string }) {
  const TONE_CLASS = {
    red: 'text-status-red bg-status-red-bg',
    amber: 'text-status-amber bg-status-amber-bg',
    gray: 'text-status-gray bg-status-gray-bg',
  }[tone]
  return (
    <Link to={to} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className={`rounded-full px-2.5 py-1 font-mono text-sm font-bold ${TONE_CLASS}`}>{valor}</span>
    </Link>
  )
}

export default function Resumo() {
  const { hospitalId } = useHospital()
  const { data: ocs = [] } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)

  const ocsAbertas = ocs.filter((o) => !(FINAL_SIT as readonly string[]).includes(o.sit))
  const ocsStatus = contarPorStatus(
    ocsAbertas,
    (o) => o.sit,
    (o) => parseDMY(o.dataSolic),
  )

  const solsAbertas = sols.filter((s) => s.sit === 'Aberta')
  const solsStatus = contarPorStatus(
    solsAbertas,
    () => 'Aberta',
    (s) => parseDMY(s.data),
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Resumo Diário</h2>
        <p className="text-sm text-slate-500">
          {getHoje().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Ordens de Compra</h3>
          {ocsAbertas.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
              ✅ Nenhum item
            </p>
          ) : (
            <>
              <Cartao label="Vencidas" valor={ocsStatus.vencidas} tone="red" to="/ocs/ordens" />
              <Cartao label="Urgentes (≤3 dias)" valor={ocsStatus.urgentes} tone="amber" to="/ocs/ordens" />
              <Cartao label="No prazo" valor={ocsStatus.noPrazo} tone="gray" to="/ocs/ordens" />
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Solicitações Abertas</h3>
          {solsAbertas.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
              ✅ Nenhum item
            </p>
          ) : (
            <>
              <Cartao label="Vencidas" valor={solsStatus.vencidas} tone="red" to="/ocs/solicitacoes" />
              <Cartao label="Urgentes (≤3 dias)" valor={solsStatus.urgentes} tone="amber" to="/ocs/solicitacoes" />
              <Cartao label="No prazo" valor={solsStatus.noPrazo} tone="gray" to="/ocs/solicitacoes" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
