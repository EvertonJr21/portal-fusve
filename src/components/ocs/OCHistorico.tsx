import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { HospitalId } from '@/constants'
import { FINAL_SIT, PRAZO } from '@/constants'
import { useHistOC } from '@/hooks/useHistOC'
import { useAtualizarOC } from '@/hooks/useOCs'
import { useToast } from '@/hooks/useToast'
import type { OC, Solicitacao } from '@/types'
import { addDias, fmt, fromInput, getHoje, parseDMY, toInput } from '@/utils/date'
import { dataPrazo } from '@/utils/oc'

interface OCHistoricoProps {
  oc: OC
  sols: Solicitacao[]
  hospitalId: HospitalId
  onClose: () => void
}

const CANAL_ICON: Record<string, string> = { mail: '✉', 'mail (lote)': '✉', wpp: '💬', lembrete: '🔔' }

export function OCHistorico({ oc, sols, hospitalId, onClose }: OCHistoricoProps) {
  const { data: historico = [], isLoading } = useHistOC(oc.id)
  const atualizar = useAtualizarOC(hospitalId)
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

  return (
    <Modal
      title={`Histórico — OC ${oc.id}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={atualizar.isPending}>
            {atualizar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p>Prazo institucional: {dPrazo ? fmt(dPrazo) : '—'}</p>
          {leadTime ? (
            <p className={leadTime.noPrazo ? 'text-status-green' : 'text-status-red'}>
              Lead time: {leadTime.dias}d — {leadTime.noPrazo ? '✓ no prazo' : '✗ fora do prazo'}
            </p>
          ) : FINAL_SIT.includes(oc.sit as (typeof FINAL_SIT)[number]) ? (
            <p className="text-status-amber">Situação final sem data de entrega registrada.</p>
          ) : (
            <p>Aguardando entrega.</p>
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
          <input
            type="text"
            placeholder="Ex.: Sem estoque, Transportadora..."
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={motivoAtraso}
            onChange={(e) => setMotivoAtraso(e.target.value)}
          />
        </label>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Histórico de cobranças</h4>
          {isLoading && <p className="text-sm text-slate-400">Carregando...</p>}
          {!isLoading && historico.length === 0 && <p className="text-sm text-slate-400">Nenhuma cobrança registrada.</p>}
          <ul className="flex flex-col gap-1">
            {historico.map((h) => (
              <li key={h.hid} className="flex items-center gap-2 border-b border-slate-100 py-1.5 text-xs">
                <span>{CANAL_ICON[h.canal] ?? '•'}</span>
                <span className="text-slate-400">{new Date(h.ts).toLocaleString('pt-BR')}</span>
                {h.tipo === 'lote' && (
                  <span className="rounded bg-slate-100 px-1 text-[10px] font-medium text-slate-500">lote</span>
                )}
                {h.resposta && <span className="text-slate-600">{h.resposta}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
