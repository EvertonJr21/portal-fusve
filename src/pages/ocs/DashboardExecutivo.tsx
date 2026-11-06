import { Link } from 'react-router-dom'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { tomPct } from '@/utils/desempenhoUi'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { useHistoricoTodos } from '@/hooks/useHistOC'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { ocsPendentes, ocsPrevisaoDescumprida, ocsSemPrevisao, ocsVencidas } from '@/utils/oc'
import { cicloInterno, desempenhoPorFornecedor, formatarDias, formatarPct, resumir } from '@/utils/kpis'

function CardLink({ to, label, value, sub, tone }: { to: string; label: string; value: number | string; sub?: string; tone: 'blue' | 'red' | 'amber' | 'green' | 'gray' }) {
  return (
    <Link to={to} className="block transition-transform hover:-translate-y-0.5">
      <KpiCard label={label} value={value} sub={sub} tone={tone} />
    </Link>
  )
}

export default function DashboardExecutivo() {
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading: carregandoOCs } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { avaliacoes, forns, isLoading: carregandoEntrega } = useAvaliacoesEntrega()
  const { data: cobrancas = [], isLoading: carregandoHist } = useHistoricoTodos()

  if (carregandoOCs || carregandoHist || carregandoEntrega) return <SkeletonRows linhas={4} colunas={3} />

  const pendentes = ocsPendentes(ocs)
  const vencidas = ocsVencidas(ocs, sols)
  const semPrevisao = ocsSemPrevisao(ocs)
  const descumpridas = ocsPrevisaoDescumprida(ocs)

  const ocIdsHospital = new Set(ocs.map((o) => o.id))
  const cobrancasDoHospital = cobrancas.filter((h) => ocIdsHospital.has(h.ocId))
  const cobrancasPendentes = cobrancasDoHospital.filter((h) => !h.respondidoEm)

  const entrega = resumir(avaliacoes)
  const notaD = desempenhoPorFornecedor(avaliacoes, forns).filter((d) => d.classe?.classe === 'D').length
  const ciclo = cicloInterno(ocs, sols)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Dashboard Executivo</h2>
        <p className="text-sm text-slate-500">Indicadores acionáveis — clique em qualquer card pra ver o detalhe</p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Ordens de Compra</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <CardLink to="/ocs/ordens" label="OCs abertas" value={pendentes.length} tone="blue" />
          <CardLink to="/ocs/ordens?rapido=vencidas" label="Atrasadas" value={vencidas.length} tone="red" />
          <CardLink to="/ocs/ordens?rapido=sem_previsao" label="Sem previsão" value={semPrevisao.length} tone="amber" />
          <CardLink to="/ocs/ordens?rapido=previsao_descumprida" label="Previsões descumpridas" value={descumpridas.length} tone="red" />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Cobrança e Fornecedores</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <CardLink to="/ocs" label="Cobranças sem resposta" value={cobrancasPendentes.length} sub={`de ${cobrancasDoHospital.length} no total`} tone="amber" />
          <CardLink to="/ocs/ranking" label="Fornecedores nota D" value={notaD} sub="OTIF abaixo de 60%" tone={notaD ? 'red' : 'gray'} />
          <CardLink to="/ocs/metricas" label="Lead time OC → entrada" value={formatarDias(entrega.leadTimeMediana)} sub={`mediana · P90 ${formatarDias(entrega.leadTimeP90)}`} tone="blue" />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Entrega e ciclo interno</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <CardLink to="/ocs/metricas" label="OTIF" value={formatarPct(entrega.otif)} sub="no prazo e completo" tone={tomPct(entrega.otif)} />
          <CardLink to="/ocs/metricas" label="On Time" value={formatarPct(entrega.onTime)} sub={`${entrega.abertasVencidas} abertas vencidas`} tone={tomPct(entrega.onTime)} />
          <CardLink
            to="/ocs/sla"
            label="Ciclo interno"
            value={formatarDias(ciclo.mediana)}
            sub={`Solicitação → OC · ${formatarPct(ciclo.pct)} na meta`}
            tone={ciclo.pct === null ? 'gray' : ciclo.pct >= 0.85 ? 'green' : 'amber'}
          />
        </div>
      </div>
    </div>
  )
}
