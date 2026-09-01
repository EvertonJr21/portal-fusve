import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { HospitalId } from '@/constants'
import { FINAL_SIT, MOTIVOS_OCORRENCIA, PRAZO } from '@/constants'
import { useHistOC, useMarcarRespondida } from '@/hooks/useHistOC'
import { useAtualizarOC } from '@/hooks/useOCs'
import { useToast } from '@/hooks/useToast'
import type { HistOC, OC, Solicitacao } from '@/types'
import { addDias, diasEntre, fmt, fromInput, getHoje, parseDMY, toInput } from '@/utils/date'
import { dataPrazo } from '@/utils/oc'

interface OCHistoricoProps {
  oc: OC
  sols: Solicitacao[]
  hospitalId: HospitalId
  onClose: () => void
}

const CANAL_ICON: Record<string, string> = { mail: '✉', 'mail (lote)': '✉', wpp: '💬', lembrete: '🔔' }
const CANAL_LABEL: Record<string, string> = { mail: 'E-mail', 'mail (lote)': 'E-mail (lote)', wpp: 'WhatsApp', lembrete: 'Lembrete' }

interface EventoTimeline {
  data: Date | null
  titulo: string
  detalhe?: string
  icone: string
  acao?: { label: string; onClick: () => void }
}

export function OCHistorico({ oc, sols, hospitalId, onClose }: OCHistoricoProps) {
  const { data: historico = [], isLoading } = useHistOC(oc.id)
  const atualizar = useAtualizarOC(hospitalId)
  const marcarRespondida = useMarcarRespondida()
  const toast = useToast()

  const [previsaoForn, setPrevisaoForn] = useState(toInput(oc.previsaoForn))
  const [dataEntregaReal, setDataEntregaReal] = useState(toInput(oc.dataEntregaReal))
  const [proximaAcao, setProximaAcao] = useState(oc.proximaAcao ?? '')
  const [motivoAtraso, setMotivoAtraso] = useState(oc.motivoAtraso ?? '')

  const dp = dataPrazo(oc, sols)
  const dPrazo = dp ? addDias(dp, PRAZO) : null
  const leadTime = (() => {
    if (!oc.dataEntregaReal) return null
    const dSolic = parseDMY(oc.dataSolic)
    const dEntrega = parseDMY(oc.dataEntregaReal)
    if (!dSolic || !dEntrega) return null
    const dias = Math.round((dEntrega.getTime() - dSolic.getTime()) / 86_400_000)
    const noPrazo = dPrazo ? dEntrega <= dPrazo : true
    return { dias, noPrazo }
  })()

  const desvioPrevisao = (() => {
    const dPrevisao = parseDMY(oc.previsaoForn)
    const dEntrega = parseDMY(oc.dataEntregaReal)
    if (!dPrevisao || !dEntrega) return null
    const dias = diasEntre(dPrevisao, dEntrega)
    return { dias, cumprida: dias <= 0 }
  })()

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

    let previsaoDescumprida = oc.previsaoDescumprida
    if (dEntregaReal) previsaoDescumprida = false
    else if (dPrevisaoForn) {
      const d = parseDMY(dPrevisaoForn)
      previsaoDescumprida = !!d && d < getHoje()
    }

    let novaSit = oc.sit
    if (dEntregaReal && !FINAL_SIT.includes(oc.sit as (typeof FINAL_SIT)[number])) {
      if (confirm('Entrega registrada. Marcar a OC como "Atendida"?')) novaSit = 'Atendida'
    }

    try {
      await atualizar.mutateAsync({
        id: oc.id,
        patch: {
          previsaoForn: dPrevisaoForn,
          dataEntregaReal: dEntregaReal,
          proximaAcao: proximaAcao || null,
          motivoAtraso: motivoAtraso || null,
          previsaoDescumprida,
          ultimaMovimentacao: fmt(getHoje()),
          sit: novaSit,
        },
      })
      toast.show(`OC ${oc.id} atualizada`)
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar', 'error')
    }
  }

  // Monta a timeline cronológica: solicitação de origem → OC autorizada → cobranças → entrega.
  const sol = oc.solicitacaoId ? sols.find((s) => s.id === oc.solicitacaoId) : null
  const eventos: EventoTimeline[] = []
  if (sol) {
    eventos.push({ data: parseDMY(sol.data), titulo: `Solicitação #${sol.id} criada`, detalhe: sol.produto, icone: '📝' })
  }
  eventos.push({ data: parseDMY(oc.dataSolic), titulo: `OC ${oc.id} autorizada`, detalhe: oc.fornecedorNome, icone: '📄' })
  for (const h of historico) {
    const respondida = !!h.respondidoEm
    eventos.push({
      data: new Date(h.ts),
      titulo: `Cobrança por ${CANAL_LABEL[h.canal] ?? h.canal}${h.tipo === 'lote' ? ' (lote)' : ''}`,
      detalhe: h.resposta || undefined,
      icone: CANAL_ICON[h.canal] ?? '📨',
      acao: respondida
        ? undefined
        : { label: '✓ Marcar como respondida', onClick: () => handleMarcarRespondida(h) },
    })
    if (respondida && h.respondidoEm) {
      eventos.push({ data: new Date(h.respondidoEm), titulo: 'Fornecedor respondeu', icone: '✅' })
    }
  }
  if (oc.dataEntregaReal) {
    eventos.push({ data: parseDMY(oc.dataEntregaReal), titulo: 'Entrega registrada', icone: '📦' })
  }
  eventos.sort((a, b) => (a.data?.getTime() ?? 0) - (b.data?.getTime() ?? 0))

  return (
    <Modal
      title={`Histórico — OC ${oc.id}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} loading={atualizar.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p>Prazo institucional: {dPrazo ? fmt(dPrazo) : '—'}</p>
          {leadTime && (
            <p className={leadTime.noPrazo ? 'text-status-green' : 'text-status-red'}>
              Lead time: {leadTime.dias}d — {leadTime.noPrazo ? '✓ no prazo' : '✗ fora do prazo'}
            </p>
          )}
          {desvioPrevisao ? (
            <p className={desvioPrevisao.cumprida ? 'text-status-green' : 'text-status-red'}>
              Previsão: {oc.previsaoForn} → Entregue: {oc.dataEntregaReal}
              {' — '}
              {desvioPrevisao.cumprida
                ? desvioPrevisao.dias < 0
                  ? `entregue ${Math.abs(desvioPrevisao.dias)}d antes da previsão`
                  : 'no prazo previsto'
                : `+${desvioPrevisao.dias}d de atraso sobre a previsão`}
            </p>
          ) : !leadTime && FINAL_SIT.includes(oc.sit as (typeof FINAL_SIT)[number]) ? (
            <p className="text-status-amber">Situação final sem data de entrega registrada.</p>
          ) : (
            !leadTime && <p>Aguardando entrega.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Previsão do fornecedor</span>
            <input
              type="date"
              className="rounded-md border border-slate-300 px-2 py-1.5"
              value={previsaoForn}
              onChange={(e) => setPrevisaoForn(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Data de entrega real</span>
            <input
              type="date"
              className="rounded-md border border-slate-300 px-2 py-1.5"
              value={dataEntregaReal}
              onChange={(e) => setDataEntregaReal(e.target.value)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Próxima ação</span>
          <input
            type="text"
            placeholder="Ex.: Cobrar fornecedor, Aguardar retorno..."
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={proximaAcao}
            onChange={(e) => setProximaAcao(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Motivo do atraso</span>
          <select
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={MOTIVOS_OCORRENCIA.includes(motivoAtraso as (typeof MOTIVOS_OCORRENCIA)[number]) ? motivoAtraso : ''}
            onChange={(e) => setMotivoAtraso(e.target.value)}
          >
            <option value="">— selecionar —</option>
            {MOTIVOS_OCORRENCIA.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            {motivoAtraso && !MOTIVOS_OCORRENCIA.includes(motivoAtraso as (typeof MOTIVOS_OCORRENCIA)[number]) && (
              <option value={motivoAtraso}>{motivoAtraso} (texto livre antigo)</option>
            )}
          </select>
        </label>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Linha do tempo</h4>
          {isLoading && <p className="text-sm text-slate-400">Carregando...</p>}
          {!isLoading && (
            <ol className="flex flex-col gap-0">
              {eventos.map((ev, i) => (
                <li key={i} className="relative flex gap-3 pb-4 pl-1 last:pb-0">
                  {i < eventos.length - 1 && (
                    <span className="absolute left-[13px] top-6 h-full w-px bg-slate-200" aria-hidden />
                  )}
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
        </div>
      </div>
    </Modal>
  )
}
