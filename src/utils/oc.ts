import { FINAL_SIT, PRAZO } from '@/constants'
import type { OC, Solicitacao } from '@/types'
import { diasEntre, getHoje, parseDMY } from './date'

export type StatusPrazo = 'atendida' | 'vencida' | 'urgente' | 'ok'

/** Data de referência do prazo institucional: a data da Solicitação de origem, não da OC. */
export function dataPrazo(oc: OC, sols: Solicitacao[]): Date | null {
  if (oc.solicitacaoId) {
    const sol = sols.find((s) => s.id === oc.solicitacaoId)
    if (sol) return parseDMY(sol.data)
  }
  return parseDMY(oc.dataSolic)
}

/** Dias restantes (negativo = vencido) até o prazo institucional de 15 dias. */
export function diasRestantes(dp: Date | null): number | null {
  if (!dp) return null
  const limite = new Date(dp)
  limite.setDate(limite.getDate() + PRAZO)
  return diasEntre(getHoje(), limite)
}

export function statusPrazo(dp: Date | null, sit: string): StatusPrazo {
  if ((FINAL_SIT as readonly string[]).includes(sit)) return 'atendida'
  const dr = diasRestantes(dp)
  if (dr === null) return 'ok'
  if (dr < 0) return 'vencida'
  if (dr <= 3) return 'urgente'
  return 'ok'
}

export function diasSemMovimentacao(oc: OC): number | null {
  const ref = oc.ultimaMovimentacao || oc.dataSolic
  const d = parseDMY(ref)
  if (!d) return null
  return diasEntre(d, getHoje())
}

/** Texto do badge de semáforo de prazo, ex.: "Venc. 3d", "5d rest.", "Entregue". */
export function textoSemaforo(dp: Date | null, sit: string): string {
  const st = statusPrazo(dp, sit)
  if (st === 'atendida') return 'Entregue'
  const dr = diasRestantes(dp)
  if (dr === null) return '—'
  if (st === 'vencida') return `Venc. ${Math.abs(dr)}d`
  return `${dr}d rest.`
}

/**
 * Previsão descumprida: sinalizada explicitamente na OC, ou a previsão do
 * fornecedor já passou sem entrega registrada.
 */
export function isPrevisaoDescumprida(oc: OC): boolean {
  if (oc.previsaoDescumprida) return true
  if (oc.previsaoForn && !oc.dataEntregaReal) {
    const d = parseDMY(oc.previsaoForn)
    if (d && d < getHoje()) return true
  }
  return false
}

const naoFinal = (oc: OC) => !(FINAL_SIT as readonly string[]).includes(oc.sit)

/** OCs pendentes: excluídas as situações finais (Atendida/Cancelada/Fechada). */
export function ocsPendentes(ocs: OC[]): OC[] {
  return ocs.filter(naoFinal)
}

export function ocsSemPrevisao(ocs: OC[]): OC[] {
  return ocsPendentes(ocs).filter((o) => !o.previsaoForn)
}
