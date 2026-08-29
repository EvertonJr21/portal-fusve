import { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { PRAZO } from '@/constants'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHistoricoRecentePorOC, useMarcarRespondida } from '@/hooks/useHistOC'
import { useHospital } from '@/hooks/useHospital'
import { useExcluirOC, useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import type { HistOC, OC } from '@/types'
import { addDias, fmt, parseDMY } from '@/utils/date'
import { dataPrazo, diasSemMovimentacao, ocsPendentes, ocsSemPrevisao } from '@/utils/oc'
import { acaoRecomendada, prioridadeOC, type Prioridade } from '@/utils/prioridade'
import { OCCobrar } from './OCCobrar'
import { OCForm } from './OCForm'
import { OCHistorico } from './OCHistorico'

type FiltroPrioridade = 'todas' | Prioridade

type ModalDash =
  | { tipo: 'editar'; oc: OC }
  | { tipo: 'historico'; oc: OC }
  | { tipo: 'cobrar'; oc: OC; canal: 'mail' | 'wpp' }
  | null

const PRIORIDADE_ORDEM: Record<Prioridade, number> = { critica: 0, alta: 1, media: 2, normal: 3 }

const PRIORIDADE_CFG: Record<Prioridade, { label: string; icone: string; tone: 'red' | 'amber' | 'blue' | 'green'; headerBg: string }> = {
  critica: { label: 'Crítica', icone: '🔴', tone: 'red', headerBg: 'bg-status-red-bg' },
  alta: { label: 'Alta', icone: '🟠', tone: 'amber', headerBg: 'bg-status-amber-bg' },
  media: { label: 'Média', icone: '🟡', tone: 'blue', headerBg: 'bg-status-blue-bg' },
  normal: { label: 'Normal', icone: '🟢', tone: 'green', headerBg: 'bg-white' },
}

export function Dashboard() {
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading, error } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: forns = [] } = useFornecedores()
  const excluir = useExcluirOC(hospitalId)
  const marcarRespondida = useMarcarRespondida()
  const toast = useToast()

  const [filtro, setFiltro] = useState<FiltroPrioridade>('todas')
  const [modal, setModal] = useState<ModalDash>(null)

  const pendentes = ocsPendentes(ocs)
  const { data: ultimasCobrancas = new Map<number, HistOC>() } = useHistoricoRecentePorOC(pendentes.map((o) => o.id))

  if (isLoading) return <SkeletonRows linhas={5} colunas={3} />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar OCs: {error.message}</p>

  const semPrevisao = ocsSemPrevisao(ocs)

  const avaliadas = pendentes.map((oc) => {
    const ultimaCobranca = ultimasCobrancas.get(oc.id) ?? null
    return {
      oc,
      ultimaCobranca,
      prioridade: prioridadeOC(oc, sols, ultimaCobranca),
      acao: acaoRecomendada(oc, sols, ultimaCobranca),
    }
  })

  const contagem: Record<Prioridade, number> = { critica: 0, alta: 0, media: 0, normal: 0 }
  for (const a of avaliadas) contagem[a.prioridade]++

  const lista = avaliadas
    .filter((a) => filtro === 'todas' || a.prioridade === filtro)
    .sort((a, b) => PRIORIDADE_ORDEM[a.prioridade] - PRIORIDADE_ORDEM[b.prioridade])

  const handleExcluir = async (oc: OC) => {
    if (!confirm(`Excluir a OC ${oc.id}?`)) return
    try {
      await excluir.mutateAsync(oc.id)
      toast.show(`OC ${oc.id} excluída`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir OC', 'error')
    }
  }

  const handleMarcarRespondida = async (hist: HistOC) => {
    try {
      await marcarRespondida.mutateAsync({ hid: hist.hid, ocId: hist.ocId })
      toast.show(`OC ${hist.ocId} — cobrança marcada como respondida`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao registrar resposta', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {semPrevisao.length > 0 && (
        <div className="flex items-center justify-between rounded-md border border-status-amber-bg bg-status-amber-bg px-4 py-2 text-sm text-status-amber">
          <span>⚠️ {semPrevisao.length} OC(s) sem previsão do fornecedor — confirme ou notifique os fornecedores</span>
          <button type="button" className="font-semibold underline" onClick={() => setFiltro('alta')}>
            ver agora
          </button>
        </div>
      )}

      <p className="text-sm text-slate-500">
        {contagem.critica + contagem.alta > 0
          ? `${contagem.critica + contagem.alta} item(ns) precisam de atenção agora`
          : `Tudo sob controle — ${fmt(new Date())}`}
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(Object.keys(PRIORIDADE_CFG) as Prioridade[]).map((p) => (
          <KpiCard
            key={p}
            label={`${PRIORIDADE_CFG[p].icone} ${PRIORIDADE_CFG[p].label}`}
            value={contagem[p]}
            tone={PRIORIDADE_CFG[p].tone}
            active={filtro === p}
            onClick={() => setFiltro(filtro === p ? 'todas' : p)}
          />
        ))}
      </div>

      {filtro !== 'todas' && (
        <button type="button" className="self-start text-xs font-medium text-blue-700 hover:underline" onClick={() => setFiltro('todas')}>
          ← ver todas as pendências
        </button>
      )}

      <div className="flex flex-col gap-2">
        {lista.length === 0 && <EmptyState icon="✅" title="Nenhuma pendência nesta categoria." />}
        {lista.map(({ oc, ultimaCobranca, prioridade, acao }) => {
          const dp = dataPrazo(oc, sols)
          const prazoFinal = dp ? addDias(dp, PRAZO) : null
          const dsm = diasSemMovimentacao(oc)
          const forn = forns.find((f) => f.id === oc.fornecedorId)
          const cfg = PRIORIDADE_CFG[prioridade]
          const cobrancaPendente = ultimaCobranca && !ultimaCobranca.respondidoEm ? ultimaCobranca : null

          return (
            <div key={oc.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft-sm">
              <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 ${cfg.headerBg}`}>
                <div className="flex items-center gap-2 text-sm">
                  <span>{cfg.icone}</span>
                  <span className="font-mono font-bold">OC {oc.id}</span>
                  <span className="text-slate-600">{oc.fornecedorNome}</span>
                  {oc.estoque && <span className="text-xs text-slate-400">{oc.estoque}</span>}
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{cfg.label}</span>
              </div>

              <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs font-semibold text-slate-700">
                ➜ AÇÃO: {acao.toUpperCase()}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-slate-500">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>Data OC: {fmt(parseDMY(oc.dataSolic))}</span>
                  <span>Prazo: {prazoFinal ? fmt(prazoFinal) : '—'}</span>
                  <span>Previsão: {oc.previsaoForn ?? '—'}</span>
                  <span>Situação: {oc.sit}</span>
                  <span>Últ. movimentação: {dsm !== null ? `há ${dsm}d` : '—'}</span>
                  <span>
                    Últ. cobrança:{' '}
                    {ultimaCobranca
                      ? `${new Date(ultimaCobranca.ts).toLocaleDateString('pt-BR')} (${ultimaCobranca.respondidoEm ? 'respondida' : 'sem resposta'})`
                      : 'nenhuma'}
                  </span>
                  {forn?.email && <span>{forn.email}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {cobrancaPendente && (
                    <button
                      type="button"
                      className="rounded border border-status-green-bg bg-status-green-bg px-2 py-1 font-medium text-status-green hover:brightness-95"
                      onClick={() => handleMarcarRespondida(cobrancaPendente)}
                      title="Marcar a última cobrança como respondida pelo fornecedor"
                    >
                      ✓ Respondeu
                    </button>
                  )}
                  {forn?.email && (
                    <button
                      type="button"
                      className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                      title="Cobrar por e-mail"
                      onClick={() => setModal({ tipo: 'cobrar', oc, canal: 'mail' })}
                    >
                      ✉
                    </button>
                  )}
                  {forn?.wpp && (
                    <button
                      type="button"
                      className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                      title="Cobrar por WhatsApp"
                      onClick={() => setModal({ tipo: 'cobrar', oc, canal: 'wpp' })}
                    >
                      💬
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded border border-slate-200 px-2 py-1 font-medium hover:bg-slate-50"
                    onClick={() => setModal({ tipo: 'historico', oc })}
                  >
                    📋 Histórico
                  </button>
                  <button
                    type="button"
                    className="rounded border border-slate-200 px-2 py-1 font-medium hover:bg-slate-50"
                    onClick={() => setModal({ tipo: 'editar', oc })}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded border border-slate-200 px-2 py-1 font-medium text-status-red hover:bg-status-red-bg"
                    onClick={() => handleExcluir(oc)}
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
