import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SortableTh, Table, TableHead, type SortDir } from '@/components/ui/Table'
import { FINAL_SIT, SITUACOES_OC } from '@/constants'
import type { OC, Solicitacao } from '@/types'
import { fmt, parseDMY } from '@/utils/date'
import { dataPrazo, diasRestantes, diasSemMovimentacao, previsaoAtiva, riscoOC, textoSemaforo } from '@/utils/oc'

const PG = 12

type SortKey = 'id' | 'dataSolic' | 'fornecedorNome' | 'sit' | 'prazo'

const SEMAFORO_CLASS: Record<string, string> = {
  vencida: 'bg-status-red-bg text-status-red',
  urgente: 'bg-status-amber-bg text-status-amber',
  ok: 'bg-status-gray-bg text-status-gray',
  atendida: 'bg-status-green-bg text-status-green',
}

const RISCO_ICON: Record<string, string> = { alto: '🔴', medio: '🟡', baixo: '🟢' }

interface OCTableProps {
  ocs: OC[]
  sols: Solicitacao[]
  filtroKey: string
  onEditar: (oc: OC) => void
  onExcluir: (oc: OC) => void
  onAtualizarSituacao: (id: number, sit: string) => void
  onVincular: (oc: OC) => void
  onHistorico: (oc: OC) => void
  onCobrar: (oc: OC, canal: 'mail' | 'wpp') => void
}

export function OCTable({
  ocs,
  sols,
  filtroKey,
  onEditar,
  onExcluir,
  onAtualizarSituacao,
  onVincular,
  onHistorico,
  onCobrar,
}: OCTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('id')
  const [dir, setDir] = useState<SortDir>(-1)
  const [pagina, setPagina] = useState(0)

  useEffect(() => {
    setPagina(0)
  }, [filtroKey])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === 1 ? -1 : 1) as SortDir)
    else {
      setSortKey(key)
      setDir(-1)
    }
    setPagina(0)
  }

  const ordenadas = [...ocs].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'id') cmp = a.id - b.id
    else if (sortKey === 'dataSolic') cmp = (parseDMY(a.dataSolic)?.getTime() ?? 0) - (parseDMY(b.dataSolic)?.getTime() ?? 0)
    else if (sortKey === 'fornecedorNome') cmp = a.fornecedorNome.localeCompare(b.fornecedorNome)
    else if (sortKey === 'sit') cmp = a.sit.localeCompare(b.sit)
    else if (sortKey === 'prazo') {
      const da = diasRestantes(dataPrazo(a, sols)) ?? 9999
      const db = diasRestantes(dataPrazo(b, sols)) ?? 9999
      cmp = da - db
    }
    return cmp * dir
  })

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / PG))
  const inicio = pagina * PG
  const pagina_atual = ordenadas.slice(inicio, inicio + PG)

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHead>
          <tr>
            <SortableTh sortKey="id" activeKey={sortKey} sortDir={dir} onSort={handleSort}>
              Nº OC
            </SortableTh>
            <SortableTh sortKey="dataSolic" activeKey={sortKey} sortDir={dir} onSort={handleSort}>
              Data Solic.
            </SortableTh>
            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Vínculo
            </th>
            <SortableTh sortKey="fornecedorNome" activeKey={sortKey} sortDir={dir} onSort={handleSort}>
              Fornecedor
            </SortableTh>
            <SortableTh sortKey="sit" activeKey={sortKey} sortDir={dir} onSort={handleSort}>
              Situação
            </SortableTh>
            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Previsão
            </th>
            <SortableTh sortKey="prazo" activeKey={sortKey} sortDir={dir} onSort={handleSort}>
              Prazo (15d)
            </SortableTh>
            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Risco
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Ações
            </th>
          </tr>
        </TableHead>
        <tbody>
          {pagina_atual.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-12 text-center animate-fade-in">
                <span className="mb-1 block text-2xl opacity-60">🔍</span>
                <span className="text-sm font-medium text-slate-500">Nenhuma OC encontrada com os filtros atuais.</span>
              </td>
            </tr>
          )}
          {pagina_atual.map((o) => {
            const dp = dataPrazo(o, sols)
            const st = FINAL_SIT.includes(o.sit as (typeof FINAL_SIT)[number])
              ? 'atendida'
              : (() => {
                  const dr = diasRestantes(dp)
                  if (dr === null) return 'ok'
                  return dr < 0 ? 'vencida' : dr <= 3 ? 'urgente' : 'ok'
                })()
            const risco = riscoOC(o, sols)
            const dsm = diasSemMovimentacao(o)
            const prev = previsaoAtiva(o)
            const isPrev2 = prev !== null && prev === o.previsaoForn2 && o.sit === 'Parcialmente Atendida'

            return (
              <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{o.id}</td>
                <td className="px-3 py-2 text-xs">{fmt(parseDMY(o.dataSolic))}</td>
                <td className="px-3 py-2 text-xs">
                  <button
                    type="button"
                    onClick={() => onVincular(o)}
                    className="rounded px-1 text-left hover:bg-slate-100"
                    title="Vincular a uma Solicitação"
                  >
                    {o.solicitacaoId ? (
                      <span className="font-semibold text-status-green">#{o.solicitacaoId}</span>
                    ) : (
                      <span className="text-slate-300">vincular</span>
                    )}
                  </button>
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="font-medium text-slate-800">{o.fornecedorNome}</div>
                  {o.estoque && <div className="text-[11px] text-slate-400">{o.estoque}</div>}
                </td>
                <td className="px-3 py-2 text-xs">
                  <select
                    className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs"
                    value={o.sit}
                    onChange={(e) => onAtualizarSituacao(o.id, e.target.value)}
                  >
                    {SITUACOES_OC.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs">
                  {FINAL_SIT.includes(o.sit as (typeof FINAL_SIT)[number]) ? (
                    <span className="text-slate-300">—</span>
                  ) : prev ? (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                        isPrev2 ? 'bg-status-amber-bg text-status-amber' : 'bg-status-purple-bg text-status-purple'
                      }`}
                    >
                      {isPrev2 ? '2ª ' : ''}
                      {prev}
                    </span>
                  ) : (
                    <span className="rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-400">
                      + previsão
                    </span>
                  )}
                  {o.diasAtraso > 0 && <span className="ml-1 text-[10px] text-status-red">({o.diasAtraso}d atr.)</span>}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEMAFORO_CLASS[st]}`}>
                    {textoSemaforo(dp, o.sit)}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  <span>{RISCO_ICON[risco]}</span>
                  {dsm !== null && dsm >= 3 && (
                    <span
                      className={`ml-1 text-[11px] ${
                        dsm >= 10 ? 'text-status-red' : dsm >= 5 ? 'text-status-amber' : 'text-slate-400'
                      }`}
                    >
                      {dsm}d
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      title="Cobrar por e-mail"
                      onClick={() => onCobrar(o, 'mail')}
                      className="rounded border border-slate-200 px-1.5 py-1 hover:bg-slate-100"
                    >
                      ✉
                    </button>
                    <button
                      type="button"
                      title="Cobrar por WhatsApp"
                      onClick={() => onCobrar(o, 'wpp')}
                      className="rounded border border-slate-200 px-1.5 py-1 hover:bg-slate-100"
                    >
                      💬
                    </button>
                    <button
                      type="button"
                      title="Histórico e previsão"
                      onClick={() => onHistorico(o)}
                      className="rounded border border-slate-200 px-1.5 py-1 hover:bg-slate-100"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => onEditar(o)}
                      className="rounded border border-slate-200 px-1.5 py-1 hover:bg-slate-100"
                    >
                      ✏
                    </button>
                    <button
                      type="button"
                      title="Excluir"
                      onClick={() => onExcluir(o)}
                      className="rounded border border-slate-200 px-1.5 py-1 text-status-red hover:bg-status-red-bg"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </Table>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {ordenadas.length === 0
            ? '0 de 0'
            : `${inicio + 1}–${Math.min(inicio + PG, ordenadas.length)} de ${ordenadas.length}`}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
            ← Anterior
          </Button>
          <Button
            variant="outline"
            disabled={pagina >= totalPaginas - 1}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima →
          </Button>
        </div>
      </div>
    </div>
  )
}
