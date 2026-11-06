import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { FINAL_SIT, MOTIVOS_OCORRENCIA, SITUACOES_OC, type HospitalId } from '@/constants'
import { useConfirm } from '@/hooks/useConfirm'
import { useGuardaSaida } from '@/hooks/useGuardaSaida'
import { useHistOC, useMarcarRespondida } from '@/hooks/useHistOC'
import { useAtualizarOC } from '@/hooks/useOCs'
import { useToast } from '@/hooks/useToast'
import type { Fornecedor, HistOC, OC, SituacaoOC } from '@/types'
import { diasEntre, fmt, fromInput, getHoje, parseDMY, toInput } from '@/utils/date'
import type { LinhaOC } from '@/utils/ocLista'
import { BadgePrazo, BadgePrioridade } from './ocVisual'

export type AcaoPainel = 'cobrar-mail' | 'cobrar-wpp' | 'vincular' | 'editar' | 'excluir'

interface OCPainelProps {
  linha: LinhaOC
  forn: Fornecedor | undefined
  hospitalId: HospitalId
  onClose: () => void
  onAcao: (acao: AcaoPainel, oc: OC) => void
}

const CANAL_ICON: Record<string, string> = { mail: '✉', 'mail (lote)': '✉', wpp: '💬', lembrete: '🔔' }
const CANAL_LABEL: Record<string, string> = { mail: 'E-mail', 'mail (lote)': 'E-mail (lote)', wpp: 'WhatsApp', lembrete: 'Lembrete' }
const ORIGEM: Record<string, string> = { mv: 'entrada do MV', manual: 'digitada', estimada: 'estimada' }

interface EventoTimeline {
  data: Date | null
  titulo: string
  detalhe?: string
  icone: string
  acao?: { label: string; onClick: () => void }
}

const INPUT = 'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm'

/**
 * Painel lateral da OC (item 82) — substitui o modal "Histórico" e concentra
 * tudo da OC: resumo, ações, registro de previsão/entrega/motivo e linha do tempo.
 * Abre ao clicar na linha da tabela; continua aberto depois de salvar.
 */
export function OCPainel({ linha, forn, hospitalId, onClose, onAcao }: OCPainelProps) {
  const { oc, avaliacao, sol } = linha
  const guarda = useGuardaSaida(onClose)
  const { data: historico = [], isLoading } = useHistOC(oc.id)
  const atualizar = useAtualizarOC(hospitalId)
  const marcarRespondida = useMarcarRespondida()
  const toast = useToast()
  const confirmar = useConfirm()
  const navigate = useNavigate()

  const [sit, setSit] = useState<string>(oc.sit)
  const [previsaoForn, setPrevisaoForn] = useState(toInput(oc.previsaoForn))
  const [dataEntregaReal, setDataEntregaReal] = useState(toInput(oc.dataEntregaReal))
  const [dataParcial, setDataParcial] = useState(toInput(oc.dataParcial))
  const [proximaAcao, setProximaAcao] = useState(oc.proximaAcao ?? '')
  const [motivoAtraso, setMotivoAtraso] = useState(oc.motivoAtraso ?? '')

  const { fechar } = guarda
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      // Esc fecha o painel só quando nenhum modal está aberto por cima dele.
      if (e.key === 'Escape' && !document.querySelector('[data-modal-aberto]')) fechar()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [fechar])

  const handleMarcarRespondida = async (hist: HistOC) => {
    try {
      await marcarRespondida.mutateAsync({ hid: hist.hid, ocId: hist.ocId })
      toast.show('Cobrança marcada como respondida')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao registrar resposta', 'error')
    }
  }

  const handleSalvar = async () => {
    const dEntregaReal = dataEntregaReal ? fromInput(dataEntregaReal) : null
    const dPrevisaoForn = previsaoForn ? fromInput(previsaoForn) : null
    const dParcial = dataParcial ? fromInput(dataParcial) : null

    let previsaoDescumprida = oc.previsaoDescumprida
    if (dEntregaReal) previsaoDescumprida = false
    else if (dPrevisaoForn) {
      const d = parseDMY(dPrevisaoForn)
      previsaoDescumprida = !!d && d < getHoje()
    }

    let novaSit = sit
    if (dEntregaReal && !oc.dataEntregaReal && !FINAL_SIT.includes(sit as (typeof FINAL_SIT)[number])) {
      if (await confirmar('Entrega registrada. Marcar a OC como "Atendida"?')) novaSit = 'Atendida'
    }

    try {
      await atualizar.mutateAsync({
        id: oc.id,
        patch: {
          previsaoForn: dPrevisaoForn,
          dataEntregaReal: dEntregaReal,
          // Data digitada aqui vale como confirmada (origem manual); apagar a data limpa a origem.
          ...(dEntregaReal !== oc.dataEntregaReal ? { dataEntregaOrigem: dEntregaReal ? ('manual' as const) : null } : {}),
          dataParcial: dParcial,
          proximaAcao: proximaAcao || null,
          motivoAtraso: motivoAtraso || null,
          previsaoDescumprida,
          ultimaMovimentacao: fmt(getHoje()),
          sit: novaSit as SituacaoOC,
        },
      })
      setSit(novaSit)
      guarda.limpar()
      toast.show(`OC ${oc.id} atualizada`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar', 'error')
    }
  }

  const desvioPrevisao = (() => {
    const dPrevisao = parseDMY(oc.previsaoForn)
    const dEntrega = parseDMY(oc.dataEntregaReal)
    if (!dPrevisao || !dEntrega) return null
    return diasEntre(dPrevisao, dEntrega)
  })()

  // Linha do tempo: solicitação → OC → cobranças/respostas → entregas.
  const eventos: EventoTimeline[] = []
  if (sol) eventos.push({ data: parseDMY(sol.data), titulo: `Solicitação #${sol.id} criada`, detalhe: sol.produto, icone: '📝' })
  eventos.push({ data: parseDMY(oc.dataSolic), titulo: `OC ${oc.id} emitida`, detalhe: oc.fornecedorNome, icone: '📄' })
  for (const h of historico) {
    const respondida = !!h.respondidoEm
    eventos.push({
      data: new Date(h.ts),
      titulo: `Cobrança por ${CANAL_LABEL[h.canal] ?? h.canal}${h.tipo === 'lote' ? ' (lote)' : ''}`,
      detalhe: h.resposta || undefined,
      icone: CANAL_ICON[h.canal] ?? '📨',
      acao: respondida ? undefined : { label: '✓ Fornecedor respondeu', onClick: () => handleMarcarRespondida(h) },
    })
    if (respondida && h.respondidoEm) eventos.push({ data: new Date(h.respondidoEm), titulo: 'Fornecedor respondeu', icone: '✅' })
  }
  if (oc.dataParcial) eventos.push({ data: parseDMY(oc.dataParcial), titulo: 'Entrega parcial', icone: '📦' })
  if (oc.dataEntregaReal) {
    eventos.push({
      data: parseDMY(oc.dataEntregaReal),
      titulo: `Entrega${oc.entradaMv ? ` — entrada ${oc.entradaMv}` : ''}`,
      detalhe: `Data ${ORIGEM[oc.dataEntregaOrigem ?? 'estimada']}`,
      icone: '📦',
    })
  }
  eventos.sort((a, b) => (a.data?.getTime() ?? 0) - (b.data?.getTime() ?? 0))

  const aberta = linha.aberta
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-label={`OC ${oc.id}`}>
      <div className="absolute inset-0 bg-slate-900/20 animate-fade-in" onClick={guarda.fechar} aria-hidden />
      <aside
        onInput={guarda.marcar}
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
          <button
            type="button"
            onClick={guarda.fechar}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          <Button variant="outline" disabled={!forn?.email} title={forn?.email || 'Fornecedor sem e-mail no cadastro'} onClick={() => onAcao('cobrar-mail', oc)}>
            ✉ Cobrar por e-mail
          </Button>
          <Button variant="outline" disabled={!forn?.wpp} title={forn?.wpp || 'Fornecedor sem WhatsApp no cadastro'} onClick={() => onAcao('cobrar-wpp', oc)}>
            💬 WhatsApp
          </Button>
          <Button variant="ghost" onClick={() => onAcao('vincular', oc)}>
            🔗 {oc.solicitacaoId ? 'Trocar solicitação' : 'Vincular solicitação'}
          </Button>
          {sol && (
            <Button variant="ghost" onClick={() => navigate(`/pareceres?produto=${encodeURIComponent(sol.produto)}`)}>
              🩺 Parecer
            </Button>
          )}
          <Button variant="ghost" onClick={() => onAcao('editar', oc)}>
            ✏ Editar
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
            {oc.dataEntregaReal && (
              <Info rotulo="Entrega">
                {oc.dataEntregaReal} ({ORIGEM[oc.dataEntregaOrigem ?? 'estimada']})
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Situação">
                <select className={INPUT} value={sit} onChange={(e) => setSit(e.target.value)}>
                  {SITUACOES_OC.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Previsão do fornecedor">
                <input type="date" className={INPUT} value={previsaoForn} onChange={(e) => setPrevisaoForn(e.target.value)} />
              </Campo>
              <Campo rotulo="Entrega total">
                <input type="date" className={INPUT} value={dataEntregaReal} onChange={(e) => setDataEntregaReal(e.target.value)} />
              </Campo>
              <Campo rotulo="1ª entrega parcial">
                <input type="date" className={INPUT} value={dataParcial} onChange={(e) => setDataParcial(e.target.value)} />
              </Campo>
              <Campo rotulo="Motivo do atraso">
                <select
                  className={INPUT}
                  value={motivoAtraso}
                  onChange={(e) => setMotivoAtraso(e.target.value)}
                >
                  <option value="">— nenhum —</option>
                  {MOTIVOS_OCORRENCIA.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  {motivoAtraso && !MOTIVOS_OCORRENCIA.includes(motivoAtraso as (typeof MOTIVOS_OCORRENCIA)[number]) && (
                    <option value={motivoAtraso}>{motivoAtraso} (texto antigo)</option>
                  )}
                </select>
              </Campo>
              <Campo rotulo="Próxima ação / observação">
                <input
                  type="text"
                  className={INPUT}
                  placeholder="Ex.: aguardar retorno até sexta"
                  value={proximaAcao}
                  onChange={(e) => setProximaAcao(e.target.value)}
                />
              </Campo>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              {guarda.alterado && <span className="text-[11px] text-status-amber">alterações não salvas</span>}
              <Button onClick={handleSalvar} loading={atualizar.isPending} disabled={!guarda.alterado}>
                Salvar
              </Button>
            </div>
          </section>

          <section className="mt-5">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Linha do tempo</h4>
            {isLoading ? (
              <p className="text-sm text-slate-400">Carregando...</p>
            ) : (
              <ol className="flex flex-col">
                {eventos.map((ev, i) => (
                  <li key={i} className="relative flex gap-3 pb-4 pl-1 last:pb-0">
                    {i < eventos.length - 1 && <span className="absolute left-[13px] top-6 h-full w-px bg-slate-200" aria-hidden />}
                    <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs ring-1 ring-slate-200">
                      {ev.icone}
                    </span>
                    <div className="flex flex-1 flex-col gap-0.5 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700">{ev.titulo}</span>
                        <span className="text-[11px] text-slate-400">{ev.data ? fmt(ev.data) : '—'}</span>
                      </div>
                      {ev.detalhe && <span className="text-xs text-slate-500">{ev.detalhe}</span>}
                      {ev.acao && (
                        <button
                          type="button"
                          onClick={ev.acao.onClick}
                          className="mt-1 self-start rounded border border-status-green-bg bg-status-green-bg px-2 py-0.5 text-[11px] font-medium text-status-green hover:brightness-95"
                        >
                          {ev.acao.label}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
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

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-600">{rotulo}</span>
      {children}
    </label>
  )
}
