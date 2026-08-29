import { FINAL_SIT, PRAZO } from '@/constants'
import type { OC, Solicitacao } from '@/types'
import { diasEntre, getHoje, parseDMY } from './date'

export type StatusPrazo = 'atendida' | 'vencida' | 'urgente' | 'ok'
export type RiscoOC = 'alto' | 'medio' | 'baixo'

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

/**
 * Risco da OC: alto se vencida, com previsão descumprida, ou 10+ dias sem
 * movimentação; médio se urgente ou 5+ dias sem movimentação; baixo no resto.
 */
export function riscoOC(oc: OC, sols: Solicitacao[]): RiscoOC {
  if ((FINAL_SIT as readonly string[]).includes(oc.sit)) return 'baixo'
  const st = statusPrazo(dataPrazo(oc, sols), oc.sit)
  const dsm = diasSemMovimentacao(oc)
  if (st === 'vencida' || oc.previsaoDescumprida || (dsm !== null && dsm >= 10)) return 'alto'
  if (st === 'urgente' || (dsm !== null && dsm >= 5)) return 'medio'
  return 'baixo'
}

/**
 * Previsão de entrega ativa a exibir: a 1ª previsão do fornecedor se ainda
 * não passou, senão a 2ª previsão (entrega parcial) se a OC está parcial.
 */
export function previsaoAtiva(oc: OC): string | null {
  if (oc.previsaoForn) {
    const d = parseDMY(oc.previsaoForn)
    if (d && d >= getHoje()) return oc.previsaoForn
  }
  if (oc.previsaoForn2 && oc.sit === 'Parcialmente Atendida') {
    const d2 = parseDMY(oc.previsaoForn2)
    if (d2) return oc.previsaoForn2
  }
  return null
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

export function ocsVencidas(ocs: OC[], sols: Solicitacao[]): OC[] {
  return ocsPendentes(ocs).filter((o) => statusPrazo(dataPrazo(o, sols), o.sit) === 'vencida')
}

export function ocsSemPrevisao(ocs: OC[]): OC[] {
  return ocsPendentes(ocs).filter((o) => !o.previsaoForn)
}

/** Sem movimentação há `minDias` dias ou mais (padrão 7, usado no dashboard). */
export function ocsSemMovimentacao(ocs: OC[], minDias = 7): OC[] {
  return ocsPendentes(ocs).filter((o) => {
    const dsm = diasSemMovimentacao(o)
    return dsm !== null && dsm >= minDias
  })
}

export function ocsPrevisaoDescumprida(ocs: OC[]): OC[] {
  return ocsPendentes(ocs).filter(isPrevisaoDescumprida)
}

export function ocsParciais(ocs: OC[]): OC[] {
  return ocsPendentes(ocs).filter((o) => o.sit === 'Parcialmente Atendida')
}
