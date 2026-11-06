import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableHead } from '@/components/ui/Table'
import { OTIF_AMOSTRA_MIN, OTIF_META } from '@/constants'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { useHospital } from '@/hooks/useHospital'
import { useSols } from '@/hooks/useSols'
import { getHoje } from '@/utils/date'
import { isPrevisaoDescumprida } from '@/utils/oc'
import {
  backlogVencido,
  cicloInterno,
  confiabilidadePrevisao,
  desempenhoPorFornecedor,
  entregasAConfirmar,
  filtrarPeriodo,
  formatarDias,
  formatarPct,
  ordenarPorRisco,
  resumir,
  type GrupoAConfirmar,
} from '@/utils/kpis'
import { ClasseBadge } from '@/components/ocs/desempenho'
import { PERIODOS_ENTREGA, tomPct, type PeriodoEntrega } from '@/utils/desempenhoUi'

const TH = 'px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500'

export default function Metricas() {
  const { avaliacoes, forns, prazoPadrao, setPrazoPadrao, prazos, isLoading, error } = useAvaliacoesEntrega()
  const { hospitalId } = useHospital()
  const { data: sols = [], isLoading: carregandoSols } = useSols(hospitalId)
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
  const aConfirmar = useMemo(() => entregasAConfirmar(doPeriodo), [doPeriodo])
  const ciclo = useMemo(
    () => cicloInterno(doPeriodo.map((a) => a.oc), sols),
    [doPeriodo, sols],
  )
  // Panorama de agora (independe do período): o que está aberto hoje.
  const agora = useMemo(() => {
    const abertas = avaliacoes.filter((a) => a.status === 'aberta_vencida' || a.status === 'aberta_no_prazo')
    return {
      abertas: abertas.length,
      vencidas: abertas.filter((a) => a.status === 'aberta_vencida').length,
      semPrevisao: abertas.filter((a) => !a.oc.previsaoForn).length,
      descumpridas: abertas.filter((a) => isPrevisaoDescumprida(a.oc)).length,
    }
  }, [avaliacoes])
  const notaD = fornecedores.filter((f) => f.classe?.classe === 'D').length

  if (isLoading || carregandoSols) return <SkeletonRows colunas={6} />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar: {error.message}</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Desempenho de Entrega</h2>
          <p className="text-sm text-slate-500">Panorama das OCs abertas, OTIF e lead time dos fornecedores e ciclo interno — indicadores do período pela data da OC</p>
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

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Agora — OCs abertas (clique pra abrir a lista)</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <CardLink to="/ocs/ordens?visao=abertas" label="Abertas" value={agora.abertas} tone="blue" />
          <CardLink to="/ocs/ordens?visao=vencidas" label="Além da data prometida" value={agora.vencidas} tone={agora.vencidas ? 'red' : 'gray'} />
          <CardLink to="/ocs/ordens?visao=sem_previsao" label="Sem previsão" value={agora.semPrevisao} tone={agora.semPrevisao ? 'amber' : 'gray'} />
          <CardLink to="/ocs/ordens?visao=acao" label="Previsão descumprida" value={agora.descumpridas} tone={agora.descumpridas ? 'red' : 'gray'} />
          <CardLink to="/ocs/ranking" label="Fornecedores nota D" value={notaD} sub="no período" tone={notaD ? 'red' : 'gray'} />
        </div>
      </div>

      <h3 className="-mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Entrega dos fornecedores — OCs do período</h3>
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

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft-sm">
        <h3 className="text-sm font-semibold text-slate-800">Ciclo interno — Solicitação → OC</h3>
        <p className="mb-3 text-xs text-slate-400">
          Mede o trabalho do setor de compras, não o fornecedor — fica fora do OTIF. Meta: {ciclo.meta} dias. Conta só OCs
          vinculadas a uma solicitação.
        </p>
        {ciclo.total === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma OC do período vinculada a solicitação — importe o Acompanhamento de Compras.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              label="Dentro da meta"
              value={formatarPct(ciclo.pct)}
              sub={`${ciclo.dentroMeta} de ${ciclo.total} OCs`}
              tone={ciclo.pct === null ? 'gray' : ciclo.pct >= 0.85 ? 'green' : ciclo.pct >= 0.6 ? 'amber' : 'red'}
            />
            <KpiCard label="Mediana" value={formatarDias(ciclo.mediana)} sub="caso típico" tone="blue" />
            <KpiCard label="P90" value={formatarDias(ciclo.p90)} sub="9 em 10 OCs saem até aqui" tone="blue" />
            <KpiCard label="Fora da meta" value={ciclo.total - ciclo.dentroMeta} tone={ciclo.total - ciclo.dentroMeta ? 'red' : 'gray'} />
          </div>
        )}
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

      {aConfirmar.length > 0 && <EntregasAConfirmar grupos={aConfirmar} />}
    </div>
  )
}

function CardLink({ to, label, value, sub, tone }: { to: string; label: string; value: number | string; sub?: string; tone: 'blue' | 'red' | 'amber' | 'green' | 'gray' }) {
  return (
    <Link to={to} className="block transition-transform hover:-translate-y-0.5">
      <KpiCard label={label} value={value} sub={sub} tone={tone} />
    </Link>
  )
}

function EntregasAConfirmar({ grupos }: { grupos: GrupoAConfirmar[] }) {
  const [aberto, setAberto] = useState(false)
  const total = grupos.reduce((n, g) => n + g.avaliacoes.length, 0)
  const comSol = grupos.filter((g) => g.solicitacaoId !== null)
  return (
    <div className="rounded-xl border border-status-amber/40 bg-status-amber-bg/40 p-4">
      <button type="button" onClick={() => setAberto((v) => !v)} className="w-full text-left">
        <h3 className="text-sm font-semibold text-status-amber">
          ⚠ Entregas a confirmar: {total} OC(s) em {comSol.length} solicitação(ões) {aberto ? '▲' : '▼'}
        </h3>
        <p className="text-xs text-slate-600">
          OCs atendidas com data estimada (dia em que o relatório de OCs foi importado) ou sem data. Exporte do MV o
          Acompanhamento de Compras dessas solicitações e importe em{' '}
          <Link to="/ocs/importar" className="font-medium text-blue-700 hover:underline" onClick={(e) => e.stopPropagation()}>
            Importar
          </Link>{' '}
          — dá pra subir vários arquivos de uma vez. As que cobrem mais OCs estão no topo. OC sem data fica fora do OTIF;
          com data estimada entra, mas pode estar alguns dias errada.
        </p>
      </button>
      {aberto && (
        <div className="mt-3 max-h-96 overflow-y-auto rounded-md bg-white">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Solicitação</th>
                <th className="px-3 py-1.5 text-left">OCs</th>
                <th className="px-3 py-1.5 text-left">OC · fornecedor · data registrada</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => (
                <tr key={g.solicitacaoId ?? 'sem'} className="border-t border-slate-100 align-top">
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono font-semibold">
                    {g.solicitacaoId ?? <span className="font-sans font-normal text-slate-500">Sem vínculo</span>}
                  </td>
                  <td className="px-3 py-1.5">{g.avaliacoes.length}</td>
                  <td className="px-3 py-1.5">
                    <ul className="flex flex-col gap-0.5">
                      {g.avaliacoes.map((a) => (
                        <li key={a.oc.id}>
                          <span className="font-mono">{a.oc.id}</span>
                          <span className="text-slate-500"> · {a.oc.fornecedorNome} · </span>
                          {a.oc.dataEntregaReal ? (
                            <span className="text-status-amber">{a.oc.dataEntregaReal} (estimada)</span>
                          ) : (
                            <span className="text-status-red">sem data</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {grupos.some((g) => g.solicitacaoId === null) && (
            <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
              "Sem vínculo": a OC ainda não está ligada a uma solicitação. Ao importar o Acompanhamento da solicitação dela, o
              vínculo e a data entram juntos — confira o nº da solicitação na própria OC no MV.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
