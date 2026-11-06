import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableHead } from '@/components/ui/Table'
import { OTIF_AMOSTRA_MIN, OTIF_META } from '@/constants'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { fmt, getHoje } from '@/utils/date'
import {
  backlogVencido,
  confiabilidadePrevisao,
  desempenhoPorFornecedor,
  filtrarPeriodo,
  formatarDias,
  formatarPct,
  ordenarPorRisco,
  resumir,
  type AvaliacaoOC,
} from '@/utils/kpis'
import { ClasseBadge } from '@/components/ocs/desempenho'
import { PERIODOS_ENTREGA, tomPct, type PeriodoEntrega } from '@/utils/desempenhoUi'

const TH = 'px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500'

export default function Metricas() {
  const { avaliacoes, forns, prazoPadrao, setPrazoPadrao, prazos, isLoading, error } = useAvaliacoesEntrega()
  const [periodo, setPeriodo] = useState<PeriodoEntrega>('90')
  const [definicoesAbertas, setDefinicoesAbertas] = useState(false)

  const doPeriodo = useMemo(() => {
    const dias = periodo === 'tudo' ? null : Number(periodo)
    const ids = new Set(filtrarPeriodo(avaliacoes.map((a) => a.oc), dias, getHoje()).map((o) => o.id))
    return avaliacoes.filter((a) => ids.has(a.oc.id))
  }, [avaliacoes, periodo])

  const resumo = useMemo(() => resumir(doPeriodo), [doPeriodo])
  const previsao = useMemo(() => confiabilidadePrevisao(doPeriodo), [doPeriodo])
  const backlog = useMemo(() => backlogVencido(doPeriodo), [doPeriodo])
  const fornecedores = useMemo(() => ordenarPorRisco(desempenhoPorFornecedor(doPeriodo, forns)), [doPeriodo, forns])
  const semData = useMemo(
    () => doPeriodo.filter((a) => a.status === 'sem_data' && (a.oc.sit === 'Atendida' || a.oc.sit === 'Fechada')),
    [doPeriodo],
  )

  if (isLoading) return <SkeletonRows colunas={6} />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar: {error.message}</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Desempenho de Entrega</h2>
          <p className="text-sm text-slate-500">OTIF e lead time dos fornecedores — pela data da OC no período escolhido</p>
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
          <label className="flex items-center gap-1.5 text-xs text-slate-600" title="Usado quando o fornecedor não tem contrato ativo com prazo médio">
            Prazo padrão
            <input
              type="number"
              min={1}
              className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={prazoPadrao}
              onChange={(e) => setPrazoPadrao(Number(e.target.value))}
            />
            dias
          </label>
          <button
            type="button"
            onClick={() => setDefinicoesAbertas((v) => !v)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            {definicoesAbertas ? 'Ocultar definições' : 'ℹ️ Como é calculado'}
          </button>
        </div>
      </div>

      {definicoesAbertas && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600 shadow-soft-sm">
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <b>Data prometida</b> = data da OC + prazo médio do contrato ativo do fornecedor ({prazos.size} fornecedor(es) com
              contrato); sem contrato, + {prazoPadrao} dias. Renegociação de previsão não muda a meta.
            </li>
            <li>
              <b>On Time</b> = entrada até a data prometida (chegar antes conta como no prazo). <b>In Full</b> = OC entregue numa
              única entrada, sem passar por "Parcialmente Atendida" — aproximação por OC, já que os relatórios não trazem
              quantidade recebida por item.
            </li>
            <li>
              <b>OTIF</b> = OCs no prazo e completas ÷ (OCs entregues + OCs abertas já vencidas). Aberta vencida conta como falha.
              Canceladas ficam fora. Meta de referência: {formatarPct(OTIF_META)}.
            </li>
            <li>
              <b>Lead time</b> = dias corridos da OC até a entrada — mediana (caso típico) e P90 (pior caso de 9 em 10).
            </li>
            <li>
              <b>Nota</b> A ≥ 90%, B ≥ 75%, C ≥ 60%, D abaixo — só com {OTIF_AMOSTRA_MIN}+ OCs avaliadas.
            </li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="OTIF" value={formatarPct(resumo.otif)} sub={`${resumo.perfeitas} de ${resumo.avaliadas} OCs`} tone={tomPct(resumo.otif)} />
        <KpiCard label="On Time" value={formatarPct(resumo.onTime)} sub={`${resumo.noPrazo} no prazo`} tone={tomPct(resumo.onTime)} />
        <KpiCard label="In Full (por OC)" value={formatarPct(resumo.inFull)} sub={`${resumo.completas} de ${resumo.entregues}`} tone={tomPct(resumo.inFull)} />
        <KpiCard label="Lead time" value={formatarDias(resumo.leadTimeMediana)} sub={`mediana · P90 ${formatarDias(resumo.leadTimeP90)}`} tone="blue" />
        <KpiCard
          label="Previsões cumpridas"
          value={formatarPct(previsao.pct)}
          sub={previsao.total ? `${previsao.cumpridas} de ${previsao.total}` : 'sem previsão registrada'}
          tone={tomPct(previsao.pct)}
        />
        <KpiCard
          label="Cobertura de dados"
          value={formatarPct(resumo.cobertura)}
          sub={`${formatarPct(resumo.coberturaConfirmada)} confirmada (MV/manual)`}
          tone={resumo.cobertura === null ? 'gray' : resumo.cobertura >= 0.8 ? 'green' : 'amber'}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft-sm">
        <h3 className="text-sm font-semibold text-slate-800">OCs abertas além da data prometida</h3>
        <p className="mb-3 text-xs text-slate-400">{resumo.abertasVencidas} OC(s) — por tempo de atraso</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {backlog.map((f, i) => (
            <KpiCard key={f.rotulo} label={f.rotulo} value={f.quantidade} tone={f.quantidade === 0 ? 'gray' : i >= 2 ? 'red' : 'amber'} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Por fornecedor — pior OTIF primeiro</h3>
        {fornecedores.length === 0 ? (
          <EmptyState icon="📊" title="Nenhuma OC no período." />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <th className={TH}>Fornecedor</th>
                <th className={TH}>Nota</th>
                <th className={TH}>OTIF</th>
                <th className={TH}>On Time</th>
                <th className={TH}>In Full</th>
                <th className={TH}>Avaliadas</th>
                <th className={TH}>Lead time (med · P90)</th>
                <th className={TH}>Prazo</th>
              </tr>
            </TableHead>
            <tbody>
              {fornecedores.map((f) => (
                <tr key={f.fornecedorId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs">
                    {f.fornecedorId ? (
                      <Link to={`/ocs/ranking/${f.fornecedorId}`} className="font-medium text-blue-700 hover:underline">
                        {f.fornecedorNome}
                      </Link>
                    ) : (
                      f.fornecedorNome
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <ClasseBadge classe={f.classe} avaliadas={f.resumo.avaliadas} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-semibold">{formatarPct(f.resumo.otif)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{formatarPct(f.resumo.onTime)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{formatarPct(f.resumo.inFull)}</td>
                  <td className="px-3 py-2 text-xs">{f.resumo.avaliadas}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatarDias(f.resumo.leadTimeMediana)} · {formatarDias(f.resumo.leadTimeP90)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {f.avaliacoes[0]?.prazoFonte === 'contrato' ? `${f.avaliacoes[0].prazoDias}d (contrato)` : `${prazoPadrao}d (padrão)`}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {semData.length > 0 && <InconsistenciasEntrega lista={semData} />}
    </div>
  )
}

function InconsistenciasEntrega({ lista }: { lista: AvaliacaoOC[] }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="rounded-xl border border-status-amber/40 bg-status-amber-bg/40 p-4">
      <button type="button" onClick={() => setAberto((v) => !v)} className="text-left">
        <h3 className="text-sm font-semibold text-status-amber">
          ⚠ {lista.length} OC(s) concluída(s) sem data de entrega válida {aberto ? '▲' : '▼'}
        </h3>
        <p className="text-xs text-slate-600">
          Ficam fora do OTIF e do lead time. Importe o Acompanhamento de Compras da solicitação ou registre a entrega no
          Histórico da OC.
        </p>
      </button>
      {aberto && (
        <div className="mt-3 max-h-72 overflow-y-auto rounded-md bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-1.5 text-left">OC</th>
                <th className="px-3 py-1.5 text-left">Data da OC</th>
                <th className="px-3 py-1.5 text-left">Fornecedor</th>
                <th className="px-3 py-1.5 text-left">Data registrada</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.oc.id} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 font-mono">{a.oc.id}</td>
                  <td className="px-3 py-1.5">{fmt(a.dataOC)}</td>
                  <td className="px-3 py-1.5">{a.oc.fornecedorNome}</td>
                  <td className="px-3 py-1.5 text-slate-500">{a.oc.dataEntregaReal ?? 'sem data'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
