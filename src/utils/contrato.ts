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

/** 387.69 → "387,69"; 0/negativo → "" (campo vazio em vez de um "0" que o usuário teria que apagar). */
export function formatarPrecoBR(valor: number): string {
  if (!valor || valor < 0) return ''
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Aceita "1.234,56", "1234,56", "1234.56" ou "R$ 12" → número; texto inválido → 0. */
export function parsePrecoBR(texto: string): number {
  const limpo = texto.replace(/[^\d,.]/g, '')
  if (!limpo) return 0
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const n = Number(normalizado)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
}
