import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableHead } from '@/components/ui/Table'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHistoricoTodos } from '@/hooks/useHistOC'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useScoreReset } from '@/hooks/useScoreReset'
import { useSols } from '@/hooks/useSols'
import type { OC } from '@/types'
import { fmt, getHoje, parseDMY } from '@/utils/date'
import { calcularScoresTodos, filtrarDesdeReset, fornecedoresProblematicos, type ScoreFornecedor } from '@/utils/scoreFornecedor'

const PESOS_SCORE = [
  { peso: 35, label: 'Cumprimento de prazo', descricao: 'entregas dentro do prazo institucional' },
  { peso: 25, label: 'Taxa de atraso', descricao: 'quanto menor a taxa, maior a pontuação' },
  { peso: 15, label: 'Cumprimento de previsão', descricao: 'entregou até a data prometida' },
  { peso: 15, label: 'Responsividade', descricao: '% de cobranças respondidas' },
  { peso: 10, label: 'Tempo de resposta', descricao: 'cheio até 4h, zera em 48h' },
] as const

const PERIODOS = [
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 180 dias' },
  { value: 'tudo', label: 'Todo o período' },
] as const

function filtrarPorPeriodo(ocs: OC[], periodo: string): OC[] {
  if (periodo === 'tudo') return ocs
  const dias = Number(periodo)
  const limite = new Date(getHoje())
  limite.setDate(limite.getDate() - dias)
  return ocs.filter((o) => {
    const d = parseDMY(o.dataSolic)
    return d ? d >= limite : false
  })
}

function scoreClasse(score: number): string {
  if (score >= 80) return 'text-status-green'
  if (score >= 60) return 'text-status-amber'
  return 'text-status-red'
}

export default function RankingFornecedores() {
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading: carregandoOCs } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: forns = [] } = useFornecedores()
  const { data: cobrancas = [], isLoading: carregandoHist } = useHistoricoTodos()
  const { resetAt, resetar, limpar } = useScoreReset()

  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]['value']>('90')
  const [minOCs, setMinOCs] = useState(3)
  const [busca, setBusca] = useState('')
  const [legendaAberta, setLegendaAberta] = useState(false)

  const isLoading = carregandoOCs || carregandoHist

  const scores = useMemo(() => {
    if (isLoading) return []
    const ocsDesdeReset = filtrarDesdeReset(ocs, resetAt)
    const ocsPeriodo = filtrarPorPeriodo(ocsDesdeReset, periodo)
    return calcularScoresTodos(forns, ocsPeriodo, sols, cobrancas).sort((a, b) => b.score - a.score)
  }, [forns, ocs, sols, cobrancas, periodo, isLoading, resetAt])

  const handleResetar = () => {
    if (!confirm('Isso faz o score e o ranking passarem a contar só as OCs solicitadas a partir de agora — OCs anteriores continuam no sistema, só saem do cálculo. Confirmar?')) return
    resetar()
  }

  const problematicos = useMemo(() => new Set(fornecedoresProblematicos(scores).map((s) => s.fornecedorId)), [scores])

  const filtrados = scores.filter((s) => {
    if (s.totalOCs < minOCs) return false
    if (busca && !s.fornecedorNome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const scoreMedia = filtrados.length ? Math.round(filtrados.reduce((sum, s) => sum + s.score, 0) / filtrados.length) : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Ranking de Fornecedores</h2>
          <p className="text-sm text-slate-500">Score baseado em prazo, atraso, previsão e responsividade</p>
          {resetAt && (
            <p className="mt-1 text-xs font-medium text-status-blue">
              🔄 Contando desde {fmt(new Date(resetAt))} — OCs anteriores não entram no score.{' '}
              <button type="button" onClick={limpar} className="underline hover:text-status-blue/80">
                remover reset
              </button>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLegendaAberta((v) => !v)}>
            {legendaAberta ? 'Ocultar' : 'ℹ️ Como o score é calculado'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetar}>
            🔄 Resetar contagem
          </Button>
        </div>
      </div>

      {legendaAberta && (
        <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-soft-sm sm:grid-cols-2 lg:grid-cols-5">
          {PESOS_SCORE.map((p) => (
            <div key={p.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="font-mono text-lg font-bold text-status-blue">{p.peso}pts</div>
              <div className="text-xs font-semibold text-slate-700">{p.label}</div>
              <div className="text-[11px] text-slate-500">{p.descricao}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard label="Fornecedores avaliados" value={filtrados.length} tone="blue" />
        <KpiCard label="Score médio" value={scoreMedia} tone={scoreMedia >= 70 ? 'green' : 'amber'} />
        <KpiCard label="Problemáticos" value={filtrados.filter((s) => problematicos.has(s.fornecedorId)).length} tone="red" />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as typeof periodo)}
        >
          {PERIODOS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={minOCs}
          onChange={(e) => setMinOCs(Number(e.target.value))}
        >
          <option value={0}>Qualquer quantidade de OCs</option>
          <option value={3}>Mín. 3 OCs</option>
          <option value={5}>Mín. 5 OCs</option>
          <option value={10}>Mín. 10 OCs</option>
        </select>
        <input
          type="text"
          placeholder="Buscar fornecedor..."
          className="min-w-48 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isLoading ? (
        <SkeletonRows colunas={6} />
      ) : filtrados.length === 0 ? (
        <EmptyState icon="📊" title="Nenhum fornecedor com dados suficientes nesse filtro." />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">#</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Fornecedor</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Score</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">OCs</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Atrasos</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">% Atraso</th>
            </tr>
          </TableHead>
          <tbody>
            {filtrados.map((s: ScoreFornecedor, i: number) => (
              <tr key={s.fornecedorId} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                <td className="px-3 py-2 text-xs">
                  <Link to={`/ocs/ranking/${s.fornecedorId}`} className="font-medium text-blue-700 hover:underline">
                    {s.fornecedorNome}
                  </Link>
                  {problematicos.has(s.fornecedorId) && (
                    <span className="ml-2 rounded-full bg-status-red-bg px-1.5 py-0.5 text-[10px] font-semibold text-status-red">
                      ⚠️ problemático
                    </span>
                  )}
                </td>
                <td className={`px-3 py-2 font-mono text-sm font-bold ${scoreClasse(s.score)}`}>{s.score}</td>
                <td className="px-3 py-2 text-xs">{s.totalOCs}</td>
                <td className="px-3 py-2 text-xs">{s.ocsAtrasadas}</td>
                <td className="px-3 py-2 text-xs">{s.taxaAtraso !== null ? `${(s.taxaAtraso * 100).toFixed(1)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
