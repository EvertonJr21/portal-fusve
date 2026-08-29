import { useState } from 'react'
import { KpiCard } from '@/components/ui/KpiCard'
import { useHospital } from '@/hooks/useHospital'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useExcluirOC, useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import type { OC } from '@/types'
import { fmt, parseDMY } from '@/utils/date'
import {
  dataPrazo,
  diasSemMovimentacao,
  isPrevisaoDescumprida,
  ocsParciais,
  ocsPendentes,
  ocsPrevisaoDescumprida,
  ocsSemMovimentacao,
  ocsSemPrevisao,
  ocsVencidas,
  riscoOC,
  statusPrazo,
} from '@/utils/oc'
import { OCCobrar } from './OCCobrar'
import { OCForm } from './OCForm'
import { OCHistorico } from './OCHistorico'

type FiltroCategoria =
  | 'all'
  | 'vencidas'
  | 'sem_previsao'
  | 'sem_movimentacao'
  | 'previsao_descumprida'
  | 'parciais'

type ModalDash =
  | { tipo: 'editar'; oc: OC }
  | { tipo: 'historico'; oc: OC }
  | { tipo: 'cobrar'; oc: OC; canal: 'mail' | 'wpp' }
  | null

const RISCO_ORDEM: Record<string, number> = { alto: 0, medio: 1, baixo: 2 }

export function Dashboard() {
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading, error } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: forns = [] } = useFornecedores()
  const excluir = useExcluirOC(hospitalId)
  const toast = useToast()

  const [filtro, setFiltro] = useState<FiltroCategoria>('all')
  const [modal, setModal] = useState<ModalDash>(null)

  if (isLoading) return <p className="text-sm text-slate-400">Carregando...</p>
  if (error) return <p className="text-sm text-status-red">Erro ao carregar OCs: {error.message}</p>

  const pendentes = ocsPendentes(ocs)
  const vencidas = ocsVencidas(ocs, sols)
  const semPrevisao = ocsSemPrevisao(ocs)
  const semMovimentacao = ocsSemMovimentacao(ocs)
  const descumpridas = ocsPrevisaoDescumprida(ocs)
  const parciais = ocsParciais(ocs)
  const totalAtencao = vencidas.length + descumpridas.length + semMovimentacao.length

  const listaPorFiltro: Record<FiltroCategoria, OC[]> = {
    all: pendentes,
    vencidas,
    sem_previsao: semPrevisao,
    sem_movimentacao: semMovimentacao,
    previsao_descumprida: descumpridas,
    parciais,
  }

  const lista = [...listaPorFiltro[filtro]].sort(
    (a, b) => RISCO_ORDEM[riscoOC(a, sols)] - RISCO_ORDEM[riscoOC(b, sols)],
  )

  const handleExcluir = async (oc: OC) => {
    if (!confirm(`Excluir a OC ${oc.id}?`)) return
    try {
      await excluir.mutateAsync(oc.id)
      toast.show(`OC ${oc.id} excluída`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir OC', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {semPrevisao.length > 0 && (
        <div className="flex items-center justify-between rounded-md border border-status-amber-bg bg-status-amber-bg px-4 py-2 text-sm text-status-amber">
          <span>⚠️ {semPrevisao.length} OC(s) sem previsão do fornecedor — confirme ou notifique os fornecedores</span>
          <button type="button" className="font-semibold underline" onClick={() => setFiltro('sem_previsao')}>
            ver agora
          </button>
        </div>
      )}

      <p className="text-sm text-slate-500">
        {totalAtencao > 0
          ? `${totalAtencao} item(ns) precisam de atenção agora`
          : `Tudo sob controle — ${fmt(new Date())}`}
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Vencidas"
          value={vencidas.length}
          sub="prazo >15d"
          tone="red"
          active={filtro === 'vencidas'}
          onClick={() => setFiltro('vencidas')}
        />
        <KpiCard
          label="Sem Previsão"
          value={semPrevisao.length}
          sub="sem confirmação"
          tone="amber"
          active={filtro === 'sem_previsao'}
          onClick={() => setFiltro('sem_previsao')}
        />
        <KpiCard
          label="Sem Movimentação"
          value={semMovimentacao.length}
          sub="7+ dias"
          tone="amber"
          active={filtro === 'sem_movimentacao'}
          onClick={() => setFiltro('sem_movimentacao')}
        />
        <KpiCard
          label="Prev. Descumprida"
          value={descumpridas.length}
          sub="prazo venceu"
          tone="red"
          active={filtro === 'previsao_descumprida'}
          onClick={() => setFiltro('previsao_descumprida')}
        />
        <KpiCard
          label="Parciais"
          value={parciais.length}
          sub="entrega incompleta"
          tone="amber"
          active={filtro === 'parciais'}
          onClick={() => setFiltro('parciais')}
        />
      </div>

      {filtro !== 'all' && (
        <button type="button" className="self-start text-xs font-medium text-blue-700 hover:underline" onClick={() => setFiltro('all')}>
          ← ver todas as pendências
        </button>
      )}

      <div className="flex flex-col gap-2">
        {lista.length === 0 && (
          <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
            Nenhuma pendência nesta categoria. ✅
          </p>
        )}
        {lista.map((o) => {
          const risco = riscoOC(o, sols)
          const st = statusPrazo(dataPrazo(o, sols), o.sit)
          const dsm = diasSemMovimentacao(o)
          const forn = forns.find((f) => f.id === o.fornecedorId)
          const headerTone =
            risco === 'alto' ? 'bg-status-red-bg' : risco === 'medio' ? 'bg-status-amber-bg' : 'bg-white'

          return (
            <div key={o.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 ${headerTone}`}>
                <div className="flex items-center gap-2 text-sm">
                  <span>{risco === 'alto' ? '🔴' : risco === 'medio' ? '🟡' : '🟢'}</span>
                  <span className="font-mono font-bold">OC {o.id}</span>
                  <span className="text-slate-600">{o.fornecedorNome}</span>
                  {o.estoque && <span className="text-xs text-slate-400">{o.estoque}</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {st === 'vencida' && (
                    <span className="rounded-full bg-status-red-bg px-2 py-0.5 text-[11px] font-semibold text-status-red">
                      🔴 Venc.
                    </span>
                  )}
                  {st === 'urgente' && (
                    <span className="rounded-full bg-status-amber-bg px-2 py-0.5 text-[11px] font-semibold text-status-amber">
                      🟡 Urgente
                    </span>
                  )}
                  {!o.previsaoForn && (
                    <span className="rounded-full bg-status-purple-bg px-2 py-0.5 text-[11px] font-semibold text-status-purple">
                      Sem previsão
                    </span>
                  )}
                  {dsm !== null && dsm >= 7 && (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                      ⏱ {dsm}d s/ movim.
                    </span>
                  )}
                  {isPrevisaoDescumprida(o) && (
                    <span className="rounded-full bg-status-red-bg px-2 py-0.5 text-[11px] font-semibold text-status-red">
                      ❌ Prev. descumprida
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-slate-500">
                <div className="flex flex-wrap gap-4">
                  <span>Data: {fmt(parseDMY(o.dataSolic))}</span>
                  <span>Situação: {o.sit}</span>
                  {o.previsaoForn && <span>Previsão: {o.previsaoForn}</span>}
                  {forn?.email && <span>{forn.email}</span>}
                </div>
                <div className="flex gap-2">
                  {forn?.email && (
                    <button
                      type="button"
                      className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                      title="Cobrar por e-mail"
                      onClick={() => setModal({ tipo: 'cobrar', oc: o, canal: 'mail' })}
                    >
                      ✉
                    </button>
                  )}
                  {forn?.wpp && (
                    <button
                      type="button"
                      className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                      title="Cobrar por WhatsApp"
                      onClick={() => setModal({ tipo: 'cobrar', oc: o, canal: 'wpp' })}
                    >
                      💬
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded border border-slate-200 px-2 py-1 font-medium hover:bg-slate-50"
                    onClick={() => setModal({ tipo: 'historico', oc: o })}
                  >
                    📋 Histórico
                  </button>
                  <button
                    type="button"
                    className="rounded border border-slate-200 px-2 py-1 font-medium hover:bg-slate-50"
                    onClick={() => setModal({ tipo: 'editar', oc: o })}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded border border-slate-200 px-2 py-1 font-medium text-status-red hover:bg-status-red-bg"
                    onClick={() => handleExcluir(o)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal?.tipo === 'editar' && (
        <OCForm oc={modal.oc} hospitalId={hospitalId} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === 'historico' && (
        <OCHistorico oc={modal.oc} sols={sols} hospitalId={hospitalId} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === 'cobrar' && (
        <OCCobrar
          oc={modal.oc}
          sols={sols}
          forn={forns.find((f) => f.id === modal.oc.fornecedorId)}
          hospitalId={hospitalId}
          canalInicial={modal.canal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
