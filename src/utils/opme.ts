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

export const STATUS_OPME_TONE: Record<StatusOpme, 'amber' | 'green'> = {
  pendente: 'amber',
  entregue: 'green',
}

export const STATUS_OPME_LABEL: Record<StatusOpme, string> = {
  pendente: 'Pendente',
  entregue: 'Entregue',
}
