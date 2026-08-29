import { ALERTA_CRITICO_DIAS } from '@/constants'
import type { ContratoHeader } from '@/types'
import { diasEntre, getHoje, parseDMY } from './date'

export type StatusVigencia = 'vencido' | 'critico' | 'atencao' | 'ok' | 'sem_vigencia'

/** Dias restantes até `vigenciaFim` (negativo = vencido). Aceita `YYYY-MM-DD` (formato do input date/Postgres). */
export function diasParaVencer(vigenciaFim: string | null): number | null {
  if (!vigenciaFim) return null
  const data = vigenciaFim.includes('/') ? parseDMY(vigenciaFim) : new Date(`${vigenciaFim}T00:00:00`)
  if (!data || Number.isNaN(data.getTime())) return null
  return diasEntre(getHoje(), data)
}

/**
 * Status de vigência do contrato: vencido (passou), crítico (≤30 dias fixos),
 * atenção (dentro da janela de aviso configurada no próprio contrato,
 * `avisoRenovacaoDias`), ok (fora dessas janelas), sem_vigencia (sem data fim).
 */
export function statusVigencia(contrato: Pick<ContratoHeader, 'vigenciaFim' | 'avisoRenovacaoDias'>): StatusVigencia {
  const dias = diasParaVencer(contrato.vigenciaFim)
  if (dias === null) return 'sem_vigencia'
  if (dias < 0) return 'vencido'
  if (dias <= ALERTA_CRITICO_DIAS) return 'critico'
  if (dias <= contrato.avisoRenovacaoDias) return 'atencao'
  return 'ok'
}
