import { Link2, Maximize2, Stethoscope, Pencil } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HistoricoAlteracoes } from '@/components/ui/HistoricoAlteracoes'
import { Button } from '@/components/ui/Button'
import type { HospitalId } from '@/constants'
import { useGuardaSaida } from '@/hooks/useGuardaSaida'
import type { Fornecedor, OC } from '@/types'
import { diasEntre, fmt, parseDMY } from '@/utils/date'
import { ORIGEM_ENTREGA, type LinhaOC } from '@/utils/ocLista'
import { ContratosDoFornecedor, LinhaDoTempoOC, RegistroOC } from './OCDetalhes'
import { BadgePrazo, BadgePrioridade } from './ocVisual'

export type AcaoPainel = 'cobrar-mail' | 'cobrar-wpp' | 'vincular' | 'editar' | 'excluir'

interface OCPainelProps {
  linha: LinhaOC
  forn: Fornecedor | undefined
  hospitalId: HospitalId
  onClose: () => void
  onAcao: (acao: AcaoPainel, oc: OC) => void
}

/**
 * Painel lateral da OC (item 82) — substitui o modal "Histórico" e concentra
 * tudo da OC: resumo, ações, registro de previsão/entrega/motivo e linha do tempo.
 * Abre ao clicar na linha da tabela; continua aberto depois de salvar.
 */
export function OCPainel({ linha, forn, hospitalId, onClose, onAcao }: OCPainelProps) {
  const { oc, avaliacao, sol } = linha
  const guarda = useGuardaSaida(onClose)
  const navigate = useNavigate()

  const { fechar } = guarda
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      // Esc fecha o painel só quando nenhum modal está aberto por cima dele.
      if (e.key === 'Escape' && !document.querySelector('[data-modal-aberto]')) fechar()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [fechar])

  const desvioPrevisao = (() => {
    const dPrevisao = parseDMY(oc.previsaoForn)
    const dEntrega = parseDMY(oc.dataEntregaReal)
    if (!dPrevisao || !dEntrega) return null
    return diasEntre(dPrevisao, dEntrega)
  })()

  const aberta = linha.aberta
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-label={`OC ${oc.id}`}>
      <div className="absolute inset-0 bg-slate-900/20 animate-fade-in" onClick={guarda.fechar} aria-hidden />
      <aside
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-soft-lg animate-slide-in-right"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-mono text-base font-bold text-slate-800">OC {oc.id}</h3>
              <BadgePrazo linha={linha} />
              {linha.prioridade && <BadgePrioridade prioridade={linha.prioridade} />}
            </div>
            <p className="mt-0.5 truncate text-sm text-slate-600">{oc.fornecedorNome}</p>
            {aberta && linha.acao && <p className="mt-1 text-xs font-medium text-slate-700">➜ {linha.acao}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => navigate(`/ocs/ordens/${oc.id}`)}
            title="Abrir a página completa da OC"
            aria-label="Abrir página da OC"
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={guarda.fechar}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          <Button variant="outline" disabled={!forn?.email} title={forn?.email || 'Fornecedor sem e-mail no cadastro'} onClick={() => onAcao('cobrar-mail', oc)}>
            ✉ Cobrar por e-mail
          </Button>
          <Button variant="outline" disabled={!forn?.wpp} title={forn?.wpp || 'Fornecedor sem WhatsApp no cadastro'} onClick={() => onAcao('cobrar-wpp', oc)}>
            💬 WhatsApp
          </Button>
          <Button variant="ghost" onClick={() => onAcao('vincular', oc)}>
            <Link2 className="h-3.5 w-3.5" /> {oc.solicitacaoId ? 'Trocar solicitação' : 'Vincular solicitação'}
          </Button>
          {sol && (
            <Button variant="ghost" onClick={() => navigate(`/pareceres?produto=${encodeURIComponent(sol.produto)}`)}>
              <Stethoscope className="h-3.5 w-3.5" /> Parecer
            </Button>
          )}
          <Button variant="ghost" onClick={() => onAcao('editar', oc)}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          <Button variant="ghost" className="text-status-red" onClick={() => onAcao('excluir', oc)}>
            Excluir
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <Info rotulo="Data da OC">{fmt(avaliacao.dataOC)}</Info>
            <Info rotulo={`Data prometida (${avaliacao.prazoDias}d, ${avaliacao.prazoFonte === 'contrato' ? 'contrato' : 'padrão'})`}>
              {fmt(avaliacao.dataPrometida) || '—'}
            </Info>
            <Info rotulo="Prazo institucional (solicitação + 15)">{fmt(linha.prazoInstitucional) || '—'}</Info>
            <Info rotulo="Situação">{oc.sit}</Info>
            <Info rotulo="Solicitação">
              {sol ? (
                <>
                  #{sol.id} — {sol.produto}
                  {sol.qtd ? ` (${sol.qtd})` : ''}
                </>
              ) : oc.solicitacaoId ? (
                `#${oc.solicitacaoId}`
              ) : (
                <span className="text-slate-400">não vinculada</span>
              )}
            </Info>
            <Info rotulo="Estoque">{oc.estoque || '—'}</Info>
            <Info rotulo="Última movimentação">
              {linha.diasSemMov !== null ? `há ${linha.diasSemMov}d` : oc.ultimaMovimentacao || '—'}
            </Info>
            <Info rotulo="Contato do fornecedor">{[forn?.email, forn?.wpp].filter(Boolean).join(' · ') || '—'}</Info>
            <Info rotulo="Contrato com o fornecedor">
              <ContratosDoFornecedor forn={forn} hospitalId={hospitalId} />
            </Info>
            {forn && (
              <Info rotulo="Fornecedor">
                <Link to={`/ocs/ranking/${forn.id}`} className="text-blue-700 hover:underline">
                  Ver ficha e nota de entrega →
                </Link>
              </Info>
            )}
            {oc.dataEntregaReal && (
              <Info rotulo="Entrega">
                {oc.dataEntregaReal} ({ORIGEM_ENTREGA[oc.dataEntregaOrigem ?? 'estimada']})
                {avaliacao.leadTimeDias !== null && ` · lead time ${avaliacao.leadTimeDias}d`}
              </Info>
            )}
            {desvioPrevisao !== null && (
              <Info rotulo="Previsão × entrega">
                <span className={desvioPrevisao <= 0 ? 'text-status-green' : 'text-status-red'}>
                  {desvioPrevisao <= 0 ? 'cumprida' : `+${desvioPrevisao}d sobre a previsão`}
                </span>
              </Info>
            )}
          </dl>

          <section className="mt-5 rounded-lg border border-slate-200 p-3">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Registrar</h4>
            <RegistroOC oc={oc} hospitalId={hospitalId} alterado={guarda.alterado} marcar={guarda.marcar} limpar={guarda.limpar} />
          </section>

          <section className="mt-5">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Linha do tempo</h4>
            <LinhaDoTempoOC linha={linha} />
          </section>

          <section className="mt-5">
            <HistoricoAlteracoes tabela="ocs" registroId={oc.id} limite={15} />
          </section>
        </div>
      </aside>
    </div>
  )
}

function Info({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-slate-400">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-slate-700">{children}</dd>
    </div>
  )
}
