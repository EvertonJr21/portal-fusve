import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import { Table, TableHead } from '@/components/ui/Table'
import { SolForm } from '@/components/ocs/SolForm'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useAtualizarSituacaoSol, useExcluirSol, useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import type { Solicitacao } from '@/types'
import { fmt, parseDMY } from '@/utils/date'
import { statusPrazo, textoSemaforo } from '@/utils/oc'

const SEMAFORO_CLASS: Record<string, string> = {
  vencida: 'bg-status-red-bg text-status-red',
  urgente: 'bg-status-amber-bg text-status-amber',
  ok: 'bg-status-gray-bg text-status-gray',
  atendida: 'bg-status-green-bg text-status-green',
}

export default function Solicitacoes() {
  const { hospitalId } = useHospital()
  const { data: sols = [], isLoading } = useSols(hospitalId)
  const { data: ocs = [] } = useOCs(hospitalId)
  const atualizarSituacao = useAtualizarSituacaoSol(hospitalId)
  const excluir = useExcluirSol(hospitalId)
  const toast = useToast()
  const [searchParams] = useSearchParams()

  const [busca, setBusca] = useState(() => searchParams.get('q') ?? '')

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setBusca(q)
  }, [searchParams])
  const [situacao, setSituacao] = useState('')
  const [vinculo, setVinculo] = useState<'' | 'linked' | 'unlinked'>('')
  const [modal, setModal] = useState<'novo' | Solicitacao | null>(null)

  const ocsPorSolicitacao = (solId: number) => ocs.filter((o) => o.solicitacaoId === solId)

  const filtradas = sols.filter((s) => {
    if (situacao && s.sit !== situacao) return false
    const vinculadas = ocsPorSolicitacao(s.id).length > 0
    if (vinculo === 'linked' && !vinculadas) return false
    if (vinculo === 'unlinked' && vinculadas) return false
    if (busca) {
      const q = busca.toLowerCase()
      if (
        !s.produto.toLowerCase().includes(q) &&
        !s.motivo.toLowerCase().includes(q) &&
        !s.solicitante.toLowerCase().includes(q) &&
        !String(s.id).includes(q)
      )
        return false
    }
    return true
  })

  const abertas = sols.filter((s) => s.sit === 'Aberta').length
  const vencidas = sols.filter((s) => statusPrazo(parseDMY(s.data), s.sit) === 'vencida').length
  const comOC = sols.filter((s) => ocsPorSolicitacao(s.id).length > 0).length

  const handleSituacao = async (id: number, sit: string) => {
    try {
      await atualizarSituacao.mutateAsync({ id, sit })
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao atualizar situação', 'error')
    }
  }

  const handleExcluir = async (s: Solicitacao) => {
    if (!confirm(`Excluir a Solicitação ${s.id}?`)) return
    try {
      await excluir.mutateAsync(s.id)
      toast.show(`Solicitação ${s.id} excluída`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir solicitação', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Solicitações</h2>
          <p className="text-sm text-slate-500">Solicitações internas pendentes</p>
        </div>
        <Button onClick={() => setModal('novo')}>+ Nova Solicitação</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total" value={sols.length} tone="blue" />
        <KpiCard label="Abertas" value={abertas} tone="amber" />
        <KpiCard label="Vencidas" value={vencidas} tone="red" />
        <KpiCard label="Com OC" value={comOC} sub="vinculadas" tone="green" />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={situacao}
          onChange={(e) => setSituacao(e.target.value)}
        >
          <option value="">Todas as situações</option>
          <option value="Aberta">Aberta</option>
          <option value="Parcialmente Atendida">Parcialmente Atendida</option>
          <option value="Fechada">Fechada</option>
          <option value="Cancelada">Cancelada</option>
        </select>
        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={vinculo}
          onChange={(e) => setVinculo(e.target.value as typeof vinculo)}
        >
          <option value="">Todos os vínculos</option>
          <option value="linked">Com OC</option>
          <option value="unlinked">Sem OC</option>
        </select>
        <input
          type="text"
          placeholder="Buscar produto, motivo, solicitante ou nº..."
          className="min-w-64 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Nº</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Data</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Motivo / Produto</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Solicitante</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Qtd</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Situação</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Prazo</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">OC(s)</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Ações</th>
            </tr>
          </TableHead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-400">
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            )}
            {filtradas.map((s) => {
              const dp = parseDMY(s.data)
              const st = statusPrazo(dp, s.sit)
              const vinculadas = ocsPorSolicitacao(s.id)
              return (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{s.id}</td>
                  <td className="px-3 py-2 text-xs">{fmt(dp)}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium text-slate-800">{s.motivo || '—'}</div>
                    <div className="text-[11px] text-slate-400">{s.produto.slice(0, 40)}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{s.solicitante || '—'}</td>
                  <td className="px-3 py-2 text-xs">{s.qtd}</td>
                  <td className="px-3 py-2 text-xs">
                    <select
                      className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs"
                      value={s.sit}
                      onChange={(e) => handleSituacao(s.id, e.target.value)}
                    >
                      <option value="Aberta">Aberta</option>
                      <option value="Parcialmente Atendida">Parcialmente Atendida</option>
                      <option value="Fechada">Fechada</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEMAFORO_CLASS[st]}`}>
                      {textoSemaforo(dp, s.sit)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {vinculadas.length ? (
                      <div className="flex flex-wrap gap-1">
                        {vinculadas.map((o) => (
                          <span key={o.id} className="rounded-full bg-status-blue-bg px-1.5 py-0.5 text-[10px] font-semibold text-status-blue">
                            {o.id}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => setModal(s)}
                        className="rounded border border-slate-200 px-1.5 py-1 hover:bg-slate-100"
                      >
                        ✏
                      </button>
                      <button
                        type="button"
                        title="Excluir"
                        onClick={() => handleExcluir(s)}
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
      )}

      {modal && <SolForm sol={modal === 'novo' ? null : modal} hospitalId={hospitalId} onClose={() => setModal(null)} />}
    </div>
  )
}
