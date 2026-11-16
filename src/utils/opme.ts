import type { StatusOpme } from '@/constants'

/** Uma célula da grade do calendário — `data` é null nos espaços de preenchimento antes/depois do mês. */
export interface CelulaCalendario {
  data: Date | null
  chave: string
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Monta a grade de semanas (domingo-sábado) cobrindo o mês de `referencia`, com preenchimento nas pontas. */
export function construirGradeCalendario(referencia: Date): CelulaCalendario[] {
  const ano = referencia.getFullYear()
  const mes = referencia.getMonth()
  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)

  const celulas: CelulaCalendario[] = []
  for (let i = 0; i < primeiroDia.getDay(); i++) {
    celulas.push({ data: null, chave: `pad-inicio-${i}` })
  }
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const d = new Date(ano, mes, dia)
    celulas.push({ data: d, chave: toKey(d) })
  }
  while (celulas.length % 7 !== 0) {
    celulas.push({ data: null, chave: `pad-fim-${celulas.length}` })
  }
  return celulas
}

/** Os 7 dias (domingo a sábado) da semana que contém `referencia` — visão semanal do calendário. */
export function construirSemana(referencia: Date): CelulaCalendario[] {
  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate() - referencia.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)
    return { data: d, chave: toKey(d) }
  })
}

export const STATUS_OPME_TONE: Record<StatusOpme, 'amber' | 'green'> = {
  pendente: 'amber',
  finalizado: 'green',
}

export const STATUS_OPME_LABEL: Record<StatusOpme, string> = {
  pendente: 'Pendente',
  finalizado: 'Finalizado',
}

/** Dias de hoje até a cirurgia (negativo = já passou). `dataCirurgia` em `YYYY-MM-DD`. */
export function diasAteCirurgia(dataCirurgia: string, hoje: Date): number | null {
  const [a, m, d] = dataCirurgia.split('-').map(Number)
  if (!a || !m || !d) return null
  return Math.round((new Date(a, m - 1, d).getTime() - hoje.getTime()) / 86_400_000)
}

/** "Hoje", "Amanhã", "Em 5 dias", "Ontem", "Há 3 dias". */
export function rotuloPrazoCirurgia(dias: number | null): string {
  if (dias === null) return 'Sem data'
  if (dias === 0) return 'Hoje'
  if (dias === 1) return 'Amanhã'
  if (dias === -1) return 'Ontem'
  return dias > 0 ? `Em ${dias} dias` : `Há ${-dias} dias`
}

/** Mensagem pra confirmar com o fornecedor a entrega do OPME de uma cirurgia (página do OPME). */
export function mensagemConfirmacaoOpme(o: { paciente: string; dataCirurgia: string }, hospitalNome: string): string {
  const [a, m, d] = o.dataCirurgia.split('-')
  return [
    'Prezados,',
    '',
    `Solicitamos a confirmação da entrega do material OPME para a cirurgia do(a) paciente ${o.paciente}, agendada para ${d}/${m}/${a}.`,
    'Pedimos que o material chegue até o dia anterior à cirurgia e que nos informem a previsão de entrega.',
    '',
    'Atenciosamente,',
    `Setor de Compras — ${hospitalNome}`,
  ].join('\n')
}
