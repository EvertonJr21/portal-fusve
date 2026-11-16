import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { FINAL_SIT, MOTIVOS_OCORRENCIA, SITUACOES_OC, type HospitalId } from '@/constants'
import { useConfirm } from '@/hooks/useConfirm'
import { useContratos } from '@/hooks/useContratos'
import { useHistOC, useMarcarRespondida } from '@/hooks/useHistOC'
import { useAtualizarOC } from '@/hooks/useOCs'
import { useToast } from '@/hooks/useToast'
import type { Fornecedor, HistOC, OC, SituacaoOC } from '@/types'
import { statusVigencia } from '@/utils/contrato'
import { fmt, fromInput, getHoje, parseDMY, toInput } from '@/utils/date'
import { ligarContratosFornecedores } from '@/utils/kpis'
import { ORIGEM_ENTREGA, type LinhaOC } from '@/utils/ocLista'

/**
 * Partes da OC usadas tanto no painel lateral (`OCPainel`) quanto na página da
 * OC (`/ocs/ordens/:id`, item 104): registro de situação/previsão/entrega,
 * linha do tempo e contratos do fornecedor.
 */

const CANAL_ICON: Record<string, string> = { mail: '✉', 'mail (lote)': '✉', wpp: '💬', lembrete: '🔔' }
const CANAL_LABEL: Record<string, string> = { mail: 'E-mail', 'mail (lote)': 'E-mail (lote)', wpp: 'WhatsApp', lembrete: 'Lembrete' }
const INPUT = 'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm'

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-600">{rotulo}</span>
      {children}
    </label>
  )
}

interface RegistroOCProps {
  oc: OC
  hospitalId: HospitalId
  /** Controle de "alterações não salvas" (`useGuardaSaida`) do painel ou da página. */
  alterado: boolean
  marcar: () => void
  limpar: () => void
}

/** Formulário de situação, previsão, entregas, motivo e próxima ação. */
export function RegistroOC({ oc, hospitalId, alterado, marcar, limpar }: RegistroOCProps) {
  const atualizar = useAtualizarOC(hospitalId)
  const confirmar = useConfirm()
  const toast = useToast()
  const [sit, setSit] = useState<string>(oc.sit)
  const [previsaoForn, setPrevisaoForn] = useState(toInput(oc.previsaoForn))
  const [dataEntregaReal, setDataEntregaReal] = useState(toInput(oc.dataEntregaReal))
  const [dataParcial, setDataParcial] = useState(toInput(oc.dataParcial))
  const [proximaAcao, setProximaAcao] = useState(oc.proximaAcao ?? '')
  const [motivoAtraso, setMotivoAtraso] = useState(oc.motivoAtraso ?? '')

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
      limpar()
      toast.show(`OC ${oc.id} atualizada`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar', 'error')
    }
  }

  return (
    <div onInput={marcar}>
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
          <select className={INPUT} value={motivoAtraso} onChange={(e) => setMotivoAtraso(e.target.value)}>
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
        {alterado && <span className="text-[11px] text-status-amber">alterações não salvas</span>}
        <Button onClick={handleSalvar} loading={atualizar.isPending} disabled={!alterado}>
          Salvar
        </Button>
      </div>
    </div>
  )
}

interface EventoTimeline {
  data: Date | null
  titulo: string
  detalhe?: string
  icone: string
  acao?: { label: string; onClick: () => void }
}

/** Solicitação → OC → cobranças/respostas → entregas. */
export function LinhaDoTempoOC({ linha }: { linha: LinhaOC }) {
  const { oc, sol } = linha
  const { data: historico = [], isLoading } = useHistOC(oc.id)
  const marcarRespondida = useMarcarRespondida()
  const toast = useToast()

  const handleMarcarRespondida = async (hist: HistOC) => {
    try {
      await marcarRespondida.mutateAsync({ hid: hist.hid, ocId: hist.ocId })
      toast.show('Cobrança marcada como respondida')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao registrar resposta', 'error')
    }
  }

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
      detalhe: `Data ${ORIGEM_ENTREGA[oc.dataEntregaOrigem ?? 'estimada']}`,
      icone: '📦',
    })
  }
  eventos.sort((a, b) => (a.data?.getTime() ?? 0) - (b.data?.getTime() ?? 0))

  if (isLoading) return <p className="text-sm text-slate-400">Carregando...</p>
  return (
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
  )
}

/** Contratos do fornecedor da OC (item 92), cada um levando à página do contrato. */
export function ContratosDoFornecedor({ forn, hospitalId }: { forn: Fornecedor | undefined; hospitalId: HospitalId }) {
  const { data: contratos = [] } = useContratos(hospitalId)
  const lista = forn ? (ligarContratosFornecedores(contratos, [forn]).porFornecedor.get(forn.id) ?? []) : []
  if (lista.length === 0) return <span className="text-slate-400">nenhum — compra avulsa</span>
  return (
    <>
      {lista.map((c) => {
        const venc = statusVigencia(c)
        return (
          <Link
            key={c.id}
            to={`/contratos/${c.id}`}
            className={`block hover:underline ${c.status === 'Ativo' && venc !== 'vencido' ? 'text-status-green' : 'text-status-amber'}`}
          >
            {c.titulo || 'Contrato'} · {c.status}
            {venc === 'vencido' ? ' (vencido)' : ''}
            {c.prazoMedioDias ? ` · prazo ${c.prazoMedioDias}d` : ''}
          </Link>
        )
      })}
    </>
  )
}
