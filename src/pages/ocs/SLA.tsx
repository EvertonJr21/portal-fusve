import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { SLA_INTERNO_DIAS } from '@/constants'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { ocsConcluidasSemDataEntrega, slaFornecedor, slaInterno, type SlaResultado } from '@/utils/sla'

function Bloco({ titulo, sub, sla }: { titulo: string; sub: string; sla: SlaResultado }) {
  const cor = sla.pct === null ? 'gray' : sla.pct >= 0.85 ? 'green' : sla.pct >= 0.6 ? 'amber' : 'red'
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft-sm">
      <h3 className="text-sm font-semibold text-slate-800">{titulo}</h3>
      <p className="mb-3 text-xs text-slate-400">{sub}</p>
      {sla.pct === null ? (
        <p className="text-sm text-slate-400">Sem dados suficientes ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Cumprimento" value={`${(sla.pct * 100).toFixed(1)}%`} tone={cor} />
          <KpiCard label="Dentro do SLA" value={sla.dentro} tone="green" />
          <KpiCard label="Fora do SLA" value={sla.fora} tone="red" />
          <KpiCard label="Tempo médio" value={sla.tempoMedioDias !== null ? `${sla.tempoMedioDias.toFixed(1)}d` : '—'} tone="blue" />
        </div>
      )}
    </div>
  )
}

export default function SLA() {
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading: carregandoOCs } = useOCs(hospitalId)
  const { data: sols = [], isLoading: carregandoSols } = useSols(hospitalId)

  if (carregandoOCs || carregandoSols) return <SkeletonRows linhas={4} colunas={2} />

  const interno = slaInterno(ocs, sols)
  const fornecedor = slaFornecedor(ocs, sols)
  const semDataEntrega = ocsConcluidasSemDataEntrega(ocs)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">SLA</h2>
        <p className="text-sm text-slate-500">SLA interno e SLA do fornecedor — nunca misturados</p>
      </div>

      <Bloco
        titulo="SLA Interno"
        sub={`Solicitação → OC · alvo: ${SLA_INTERNO_DIAS} dias (ajustável em src/constants/index.ts)`}
        sla={interno}
      />
      <Bloco titulo="SLA do Fornecedor" sub="OC → Entrega · alvo: prazo institucional de 15 dias" sla={fornecedor} />

      {semDataEntrega > 0 && (
        <p className="text-xs text-slate-400">
          ⚠️ {semDataEntrega} OC(s) com situação final mas sem data de entrega registrada — não entram no cálculo do
          SLA do fornecedor. Registre a entrega no Histórico da OC pra esse número ficar mais preciso.
        </p>
      )}
    </div>
  )
}
