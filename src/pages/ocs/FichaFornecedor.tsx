import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ClasseBadge } from '@/components/ocs/desempenho'
import { tomPct } from '@/utils/desempenhoUi'
import { EmptyState } from '@/components/ui/EmptyState'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { StatusDot } from '@/components/ui/StatusDot'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { fmt } from '@/utils/date'
import { confiabilidadePrevisao, desempenhoPorFornecedor, formatarDias, formatarPct, type StatusEntrega } from '@/utils/kpis'

const STATUS: Record<StatusEntrega, { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  no_prazo: { label: 'Entregue no prazo', tone: 'success' },
  atrasada: { label: 'Entregue com atraso', tone: 'danger' },
  aberta_vencida: { label: 'Aberta e vencida', tone: 'danger' },
  aberta_no_prazo: { label: 'Aberta no prazo', tone: 'neutral' },
  sem_data: { label: 'Concluída sem data', tone: 'warning' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
}

const ORIGEM = { mv: 'entrada MV', manual: 'manual', estimada: 'estimada' } as const

export default function FichaFornecedor() {
  const { fornecedorId } = useParams<{ fornecedorId: string }>()
  const { avaliacoes, forns, isLoading, error } = useAvaliacoesEntrega()
  const forn = forns.find((f) => String(f.id) === fornecedorId)

  const desempenho = useMemo(() => {
    if (!forn) return null
    return desempenhoPorFornecedor(
      avaliacoes.filter((a) => a.oc.fornecedorId === forn.id),
      forns,
    )[0] ?? null
  }, [avaliacoes, forns, forn])

  if (isLoading) return <SkeletonRows linhas={4} colunas={3} />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar: {error.message}</p>
  if (!forn) return <EmptyState icon="🔍" title="Fornecedor não encontrado." />

  const r = desempenho?.resumo
  const previsao = confiabilidadePrevisao(desempenho?.avaliacoes ?? [])
  const ultimas = [...(desempenho?.avaliacoes ?? [])].sort((a, b) => b.oc.id - a.oc.id).slice(0, 30)
  const prazo = desempenho?.avaliacoes[0]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link to="/ocs/ranking" className="text-xs font-medium text-slate-400 hover:text-slate-600">
            ← Ranking de Fornecedores
          </Link>
          <h2 className="text-lg font-semibold text-slate-800">{forn.nome}</h2>
          <p className="text-sm text-slate-500">
            {[
              forn.email,
              forn.wpp,
              prazo ? `Prazo considerado: ${prazo.prazoDias} dias (${prazo.prazoFonte === 'contrato' ? 'contrato' : 'padrão'})` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-col items-center">
          <ClasseBadge classe={desempenho?.classe ?? null} avaliadas={r?.avaliadas ?? 0} grande />
          <span className="mt-1 text-xs text-slate-400">{desempenho?.classe?.acao ?? 'Nota'}</span>
        </div>
      </div>

      {!r ? (
        <EmptyState icon="📭" title="Nenhuma OC deste fornecedor no hospital ativo." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="OTIF" value={formatarPct(r.otif)} sub={`${r.perfeitas} de ${r.avaliadas}`} tone={tomPct(r.otif)} />
            <KpiCard label="On Time" value={formatarPct(r.onTime)} tone={tomPct(r.onTime)} />
            <KpiCard label="In Full (por OC)" value={formatarPct(r.inFull)} tone={tomPct(r.inFull)} />
            <KpiCard label="Lead time" value={formatarDias(r.leadTimeMediana)} sub={`mediana · P90 ${formatarDias(r.leadTimeP90)}`} tone="blue" />
            <KpiCard label="Previsões cumpridas" value={formatarPct(previsao.pct)} sub={`${previsao.total} com previsão`} tone={tomPct(previsao.pct)} />
            <KpiCard label="Abertas vencidas" value={r.abertasVencidas} sub={`${r.abertasNoPrazo} abertas no prazo`} tone={r.abertasVencidas ? 'red' : 'gray'} />
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Últimas OCs</h3>
            <div className="flex flex-col gap-1">
              {ultimas.map((a) => {
                const st = STATUS[a.status]
                return (
                  <div key={a.oc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-white px-3 py-2 text-xs">
                    <span className="flex items-center gap-2">
                      <StatusDot tone={st.tone} label={st.label} />
                      <span className="font-mono font-semibold">OC {a.oc.id}</span>
                      <span className="text-slate-500">{st.label}</span>
                      {a.inFull === false && a.dataEntrega && <span className="text-status-amber">· fracionada</span>}
                    </span>
                    <span className="flex flex-wrap gap-3 text-slate-400">
                      <span>OC: {fmt(a.dataOC)}</span>
                      <span>Prometida: {fmt(a.dataPrometida)}</span>
                      {a.dataEntrega && (
                        <span>
                          Entrada: {fmt(a.dataEntrega)}
                          {a.oc.dataEntregaOrigem ? ` (${ORIGEM[a.oc.dataEntregaOrigem]})` : ' (estimada)'}
                        </span>
                      )}
                      {a.diasAtraso > 0 && <span className="text-status-red">+{a.diasAtraso}d</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
