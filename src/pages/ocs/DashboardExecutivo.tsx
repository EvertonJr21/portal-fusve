import { Link } from 'react-router-dom'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHistoricoTodos } from '@/hooks/useHistOC'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { ocsPendentes, ocsPrevisaoDescumprida, ocsSemPrevisao, ocsVencidas } from '@/utils/oc'
import { calcularScoresTodos, fornecedoresProblematicos } from '@/utils/scoreFornecedor'
import { slaFornecedor, slaInterno } from '@/utils/sla'

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
  const { data: forns = [] } = useFornecedores()
  const { data: cobrancas = [], isLoading: carregandoHist } = useHistoricoTodos()

  if (carregandoOCs || carregandoHist) return <SkeletonRows linhas={4} colunas={3} />

  const pendentes = ocsPendentes(ocs)
  const vencidas = ocsVencidas(ocs, sols)
  const semPrevisao = ocsSemPrevisao(ocs)
  const descumpridas = ocsPrevisaoDescumprida(ocs)

  const ocIdsHospital = new Set(ocs.map((o) => o.id))
  const cobrancasDoHospital = cobrancas.filter((h) => ocIdsHospital.has(h.ocId))
  const cobrancasPendentes = cobrancasDoHospital.filter((h) => !h.respondidoEm)

  const scores = calcularScoresTodos(forns, ocs, sols, cobrancas).filter((s) => s.totalOCs >= 3)
  const problematicos = fornecedoresProblematicos(scores)
  const scoreMedia = scores.length ? Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length) : null

  const interno = slaInterno(ocs, sols)
  const fornecedor = slaFornecedor(ocs, sols)

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
          <CardLink to="/ocs" label="Atrasadas" value={vencidas.length} tone="red" />
          <CardLink to="/ocs" label="Sem previsão" value={semPrevisao.length} tone="amber" />
          <CardLink to="/ocs" label="Previsões descumpridas" value={descumpridas.length} tone="red" />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Cobrança e Fornecedores</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <CardLink to="/ocs" label="Cobranças sem resposta" value={cobrancasPendentes.length} sub={`de ${cobrancasDoHospital.length} no total`} tone="amber" />
          <CardLink to="/ocs/ranking" label="Fornecedores críticos" value={problematicos.length} tone="red" />
          <CardLink to="/ocs/ranking" label="Score médio" value={scoreMedia ?? '—'} tone={scoreMedia !== null && scoreMedia >= 70 ? 'green' : 'amber'} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">SLA</h3>
        <div className="grid grid-cols-2 gap-3">
          <CardLink
            to="/ocs/sla"
            label="SLA Interno"
            value={interno.pct !== null ? `${(interno.pct * 100).toFixed(0)}%` : '—'}
            sub="Solicitação → OC"
            tone={interno.pct === null ? 'gray' : interno.pct >= 0.85 ? 'green' : 'amber'}
          />
          <CardLink
            to="/ocs/sla"
            label="SLA Fornecedor"
            value={fornecedor.pct !== null ? `${(fornecedor.pct * 100).toFixed(0)}%` : '—'}
            sub="OC → Entrega"
            tone={fornecedor.pct === null ? 'gray' : fornecedor.pct >= 0.85 ? 'green' : 'amber'}
          />
        </div>
      </div>
    </div>
  )
}
