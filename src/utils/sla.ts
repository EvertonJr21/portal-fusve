import { FINAL_SIT, SLA_INTERNO_DIAS } from '@/constants'
import type { OC, Solicitacao } from '@/types'
import { diasEntre, parseDMY } from './date'
import { dataPrazo } from './oc'

export interface SlaResultado {
  total: number
  dentro: number
  fora: number
  pct: number | null
  tempoMedioDias: number | null
}

const SEM_DADO: SlaResultado = { total: 0, dentro: 0, fora: 0, pct: null, tempoMedioDias: null }

/** SLA interno: Solicitação → OC. Só considera solicitações vinculadas a uma OC. */
export function slaInterno(ocs: OC[], sols: Solicitacao[]): SlaResultado {
  const tempos = ocs
    .filter((o) => o.solicitacaoId)
    .map((o) => {
      const sol = sols.find((s) => s.id === o.solicitacaoId)
      const dSol = sol ? parseDMY(sol.data) : null
      const dOC = parseDMY(o.dataSolic)
      return dSol && dOC ? diasEntre(dSol, dOC) : null
    })
    .filter((d): d is number => d !== null)

  if (!tempos.length) return SEM_DADO
  const dentro = tempos.filter((d) => d <= SLA_INTERNO_DIAS).length
  return {
    total: tempos.length,
    dentro,
    fora: tempos.length - dentro,
    pct: dentro / tempos.length,
    tempoMedioDias: tempos.reduce((s, d) => s + d, 0) / tempos.length,
  }
}

/** SLA do fornecedor: OC → entrega, frente ao prazo institucional (15 dias da solicitação de origem). */
export function slaFornecedor(ocs: OC[], sols: Solicitacao[]): SlaResultado {
  const entregues = ocs.filter((o) => o.sit !== 'Cancelada' && o.dataEntregaReal)
  if (!entregues.length) return SEM_DADO

  let dentro = 0
  const tempos: number[] = []
  for (const o of entregues) {
    const dp = dataPrazo(o, sols)
    const dEntrega = parseDMY(o.dataEntregaReal)
    if (!dp || !dEntrega) continue
    const dPrazoFinal = new Date(dp)
    dPrazoFinal.setDate(dPrazoFinal.getDate() + 15)
    if (dEntrega <= dPrazoFinal) dentro++
    const dSolic = parseDMY(o.dataSolic)
    if (dSolic) tempos.push(diasEntre(dSolic, dEntrega))
  }

  const total = entregues.length
  return {
    total,
    dentro,
    fora: total - dentro,
    pct: total ? dentro / total : null,
    tempoMedioDias: tempos.length ? tempos.reduce((s, d) => s + d, 0) / tempos.length : null,
  }
}

/** OCs concluídas via situação final, mas sem `data_entrega_real` — não entram no cálculo do SLA do fornecedor. */
export function ocsConcluidasSemDataEntrega(ocs: OC[]): number {
  return ocs.filter((o) => FINAL_SIT.includes(o.sit as (typeof FINAL_SIT)[number]) && !o.dataEntregaReal).length
}
