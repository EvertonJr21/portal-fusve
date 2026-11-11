import { BarChart3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClasseBadge } from '@/components/ocs/desempenho'
import { PERIODOS_ENTREGA, type PeriodoEntrega } from '@/utils/desempenhoUi'
import { EmptyState } from '@/components/ui/EmptyState'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableHead } from '@/components/ui/Table'
import { OTIF_AMOSTRA_MIN, OTIF_CLASSES } from '@/constants'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { getHoje } from '@/utils/date'
import { desempenhoPorFornecedor, filtrarPeriodo, formatarDias, formatarPct } from '@/utils/kpis'

const TH = 'px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500'

export default function RankingFornecedores() {
  const { avaliacoes, forns, isLoading, error } = useAvaliacoesEntrega()
  const [periodo, setPeriodo] = useState<PeriodoEntrega>('180')
  const [classeFiltro, setClasseFiltro] = useState('')
  const [incluirSemNota, setIncluirSemNota] = useState(false)
  const [busca, setBusca] = useState('')

  const desempenho = useMemo(() => {
    const dias = periodo === 'tudo' ? null : Number(periodo)
    const ids = new Set(filtrarPeriodo(avaliacoes.map((a) => a.oc), dias, getHoje()).map((o) => o.id))
    return desempenhoPorFornecedor(
      avaliacoes.filter((a) => ids.has(a.oc.id)),
      forns,
    ).sort((a, b) => {
      if (!a.classe !== !b.classe) return a.classe ? -1 : 1
      return (b.resumo.otif ?? -1) - (a.resumo.otif ?? -1) || b.resumo.avaliadas - a.resumo.avaliadas
    })
  }, [avaliacoes, forns, periodo])

  const comNota = desempenho.filter((d) => d.classe)
  const contagem = (c: string) => comNota.filter((d) => d.classe?.classe === c).length

  const filtrados = desempenho.filter((d) => {
    if (!incluirSemNota && !d.classe) return false
    if (classeFiltro && d.classe?.classe !== classeFiltro) return false
    if (busca && !d.fornecedorNome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  if (error) return <p className="text-sm text-status-red">Erro ao carregar: {error.message}</p>

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Ranking de Fornecedores</h2>
        <p className="text-sm text-slate-500">
          Nota pelo OTIF (no prazo e completo), com no mínimo {OTIF_AMOSTRA_MIN} OCs avaliadas — mesma definição da tela
          Desempenho de Entrega
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {OTIF_CLASSES.map((c, i) => (
          <KpiCard
            key={c.classe}
            label={`Classe ${c.classe} · ${c.acao}`}
            value={contagem(c.classe)}
            sub={i === OTIF_CLASSES.length - 1 ? `OTIF abaixo de ${OTIF_CLASSES[i - 1].min}%` : `OTIF ≥ ${c.min}%`}
            tone={(['green', 'blue', 'amber', 'red'] as const)[i]}
            active={classeFiltro === c.classe}
            onClick={() => setClasseFiltro((v) => (v === c.classe ? '' : c.classe))}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as PeriodoEntrega)}
        >
          {PERIODOS_ENTREGA.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar fornecedor..."
          className="min-w-48 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={incluirSemNota} onChange={(e) => setIncluirSemNota(e.target.checked)} />
          Mostrar sem nota ({desempenho.length - comNota.length})
        </label>
      </div>

      {isLoading ? (
        <SkeletonRows colunas={6} />
      ) : filtrados.length === 0 ? (
        <EmptyState icon={<BarChart3 className="h-8 w-8" strokeWidth={1.5} />} title="Nenhum fornecedor nesse filtro." />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th className={TH}>#</th>
              <th className={TH}>Fornecedor</th>
              <th className={TH}>Nota</th>
              <th className={TH}>OTIF</th>
              <th className={TH}>On Time</th>
              <th className={TH}>In Full</th>
              <th className={TH}>Avaliadas</th>
              <th className={TH}>Atrasadas / vencidas</th>
              <th className={TH}>Lead time (med)</th>
            </tr>
          </TableHead>
          <tbody>
            {filtrados.map((d, i) => (
              <tr key={d.fornecedorId} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                <td className="px-3 py-2 text-xs">
                  {d.fornecedorId ? (
                    <Link to={`/ocs/ranking/${d.fornecedorId}`} className="font-medium text-blue-700 hover:underline">
                      {d.fornecedorNome}
                    </Link>
                  ) : (
                    d.fornecedorNome
                  )}
                </td>
                <td className="px-3 py-2">
                  <ClasseBadge classe={d.classe} avaliadas={d.resumo.avaliadas} />
                </td>
                <td className="px-3 py-2 font-mono text-sm font-bold">{formatarPct(d.resumo.otif)}</td>
                <td className="px-3 py-2 font-mono text-xs">{formatarPct(d.resumo.onTime)}</td>
                <td className="px-3 py-2 font-mono text-xs">{formatarPct(d.resumo.inFull)}</td>
                <td className="px-3 py-2 text-xs">{d.resumo.avaliadas}</td>
                <td className="px-3 py-2 text-xs">
                  {d.resumo.atrasadas} / {d.resumo.abertasVencidas}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{formatarDias(d.resumo.leadTimeMediana)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
