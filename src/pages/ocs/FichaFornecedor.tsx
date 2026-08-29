import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { FINAL_SIT } from '@/constants'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHistoricoTodos } from '@/hooks/useHistOC'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { fmt, parseDMY } from '@/utils/date'
import { dataPrazo, statusPrazo } from '@/utils/oc'
import { calcularScoreFornecedor } from '@/utils/scoreFornecedor'

function scoreClasse(score: number): string {
  if (score >= 80) return 'text-status-green'
  if (score >= 60) return 'text-status-amber'
  return 'text-status-red'
}

function pct(v: number | null): string {
  return v === null ? '—' : `${(v * 100).toFixed(0)}%`
}

function dias(v: number | null): string {
  return v === null ? '—' : `${v.toFixed(1)}d`
}

export default function FichaFornecedor() {
  const { fornecedorId } = useParams<{ fornecedorId: string }>()
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading: carregandoOCs } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: forns = [] } = useFornecedores()
  const { data: cobrancas = [], isLoading: carregandoHist } = useHistoricoTodos()

  const isLoading = carregandoOCs || carregandoHist
  const forn = forns.find((f) => String(f.id) === fornecedorId)

  const resultado = useMemo(() => {
    if (isLoading || !forn) return null
    const ocIds = new Set(ocs.filter((o) => o.fornecedorId === forn.id).map((o) => o.id))
    const cobrancasDoFornecedor = cobrancas.filter((h) => ocIds.has(h.ocId))
    return calcularScoreFornecedor(forn, ocs, sols, cobrancasDoFornecedor)
  }, [isLoading, forn, ocs, sols, cobrancas])

  if (isLoading) return <SkeletonRows linhas={4} colunas={3} />
  if (!forn) return <EmptyState icon="🔍" title="Fornecedor não encontrado." />
  if (!resultado) return null

  const ultimasOCs = [...resultado.ocs]
    .sort((a, b) => b.id - a.id)
    .slice(0, 20)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/ocs/ranking" className="text-xs font-medium text-slate-400 hover:text-slate-600">
            ← Ranking de Fornecedores
          </Link>
          <h2 className="text-lg font-semibold text-slate-800">{forn.nome}</h2>
          <p className="text-sm text-slate-500">
            {forn.email && <span>{forn.email} </span>}
            {forn.wpp && <span>· {forn.wpp}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className={`font-mono text-4xl font-bold ${scoreClasse(resultado.score)}`}>{resultado.score}</span>
          <span className="text-xs text-slate-400">Score / 100</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total de OCs" value={resultado.totalOCs} tone="blue" />
        <KpiCard label="Concluídas" value={resultado.ocsConcluidas} tone="green" />
        <KpiCard label="Em aberto" value={resultado.ocsAbertas} tone="amber" />
        <KpiCard label="Atrasadas" value={resultado.ocsAtrasadas} tone="red" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-soft-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Taxa de atraso</div>
          <div className="font-mono text-xl font-bold text-slate-800">{pct(resultado.taxaAtraso)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-soft-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tempo médio de atraso</div>
          <div className="font-mono text-xl font-bold text-slate-800">{dias(resultado.tempoMedioAtrasoDias)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-soft-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tempo médio de entrega</div>
          <div className="font-mono text-xl font-bold text-slate-800">{dias(resultado.tempoMedioEntregaDias)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-soft-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Previsões cumpridas</div>
          <div className="font-mono text-xl font-bold text-slate-800">{pct(resultado.cumprimentoPrevisaoPct)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-soft-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Responsividade</div>
          <div className="font-mono text-xl font-bold text-slate-800">{pct(resultado.responsividadePct)}</div>
          <div className="text-[11px] text-slate-400">{resultado.totalCobrancas} cobrança(s)</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-soft-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tempo médio de resposta</div>
          <div className="font-mono text-xl font-bold text-slate-800">
            {resultado.tempoMedioRespostaHoras === null ? '—' : `${resultado.tempoMedioRespostaHoras.toFixed(1)}h`}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Últimas OCs</h3>
        <div className="flex flex-col gap-1">
          {ultimasOCs.length === 0 && <EmptyState icon="📭" title="Nenhuma OC registrada." />}
          {ultimasOCs.map((o) => {
            const dp = dataPrazo(o, sols)
            const st = statusPrazo(dp, o.sit)
            const atrasada = st === 'vencida' || (o.dataEntregaReal && o.previsaoForn && parseDMY(o.dataEntregaReal)! > parseDMY(o.previsaoForn)!)
            return (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-white px-3 py-2 text-xs">
                <span className="flex items-center gap-2">
                  <span>{atrasada ? '🔴' : FINAL_SIT.includes(o.sit as (typeof FINAL_SIT)[number]) ? '🟢' : '⚪'}</span>
                  <span className="font-mono font-semibold">OC {o.id}</span>
                  <span className="text-slate-500">{o.sit}</span>
                </span>
                <span className="flex gap-3 text-slate-400">
                  <span>Data: {fmt(parseDMY(o.dataSolic))}</span>
                  {o.dataEntregaReal && <span>Entregue: {o.dataEntregaReal}</span>}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
