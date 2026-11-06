import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { cicloInterno, formatarDias, formatarPct } from '@/utils/kpis'

/**
 * Ciclo interno de compras (Solicitação → OC). Mede o trabalho do setor de
 * compras, não o fornecedor — por isso fica separado do OTIF (Desempenho de
 * Entrega). A antiga regra "SLA do fornecedor = solicitação + 30 dias" saiu
 * (item 80 do CLAUDE.md).
 */
export default function SLA() {
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading: carregandoOCs, error: erroOCs } = useOCs(hospitalId)
  const { data: sols = [], isLoading: carregandoSols, error: erroSols } = useSols(hospitalId)

  if (carregandoOCs || carregandoSols) return <SkeletonRows linhas={4} colunas={2} />
  const erro = erroOCs ?? erroSols
  if (erro) return <p className="text-sm text-status-red">Erro ao carregar: {erro.message}</p>

  const c = cicloInterno(ocs, sols)
  const tom = c.pct === null ? 'gray' : c.pct >= 0.85 ? 'green' : c.pct >= 0.6 ? 'amber' : 'red'

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Ciclo interno de compras</h2>
        <p className="text-sm text-slate-500">
          Solicitação → OC emitida · meta: {c.meta} dias (ajustável em src/constants/index.ts). O desempenho do fornecedor
          (OC → entrada) fica em Desempenho de Entrega.
        </p>
      </div>
      {c.total === 0 ? (
        <p className="text-sm text-slate-400">Sem OCs vinculadas a solicitações ainda — importe o Acompanhamento de Compras.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Dentro da meta" value={formatarPct(c.pct)} sub={`${c.dentroMeta} de ${c.total} OCs`} tone={tom} />
          <KpiCard label="Mediana" value={formatarDias(c.mediana)} sub="caso típico" tone="blue" />
          <KpiCard label="P90" value={formatarDias(c.p90)} sub="9 em 10 OCs saem até aqui" tone="blue" />
          <KpiCard label="Fora da meta" value={c.total - c.dentroMeta} tone={c.total - c.dentroMeta ? 'red' : 'gray'} />
        </div>
      )}
    </div>
  )
}
