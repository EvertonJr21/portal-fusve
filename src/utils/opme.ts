import type { StatusOpme } from '@/constants'
import type { Opme } from '@/types'
import { normalizarTexto } from '@/utils/produtos'

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

/** Paciente que já tem OPME cadastrado (item 109) — base da busca do formulário. */
export interface PacienteOpme {
  chave: string
  nome: string
  opmes: Opme[]
  /** OPME com a cirurgia mais recente — modelo dos dados copiados. */
  ultimo: Opme
}

/** Agrupa os OPMEs por paciente (nome sem acento/maiúsculas), o de cirurgia mais recente primeiro. */
export function pacientesDeOpmes(opmes: Opme[], ignorarId?: string): PacienteOpme[] {
  const grupos = new Map<string, Opme[]>()
  for (const o of opmes) {
    if (o.id === ignorarId) continue
    const chave = normalizarTexto(o.paciente)
    if (!chave) continue
    grupos.set(chave, [...(grupos.get(chave) ?? []), o])
  }
  return [...grupos.entries()]
    .map(([chave, lista]) => {
      const ordenada = [...lista].sort((a, b) => b.dataCirurgia.localeCompare(a.dataCirurgia))
      return { chave, nome: ordenada[0].paciente, opmes: ordenada, ultimo: ordenada[0] }
    })
    .sort((a, b) => b.ultimo.dataCirurgia.localeCompare(a.ultimo.dataCirurgia))
}

export function acharPaciente(lista: PacienteOpme[], nome: string): PacienteOpme | null {
  const chave = normalizarTexto(nome)
  return chave ? (lista.find((p) => p.chave === chave) ?? null) : null
}

/**
 * Copia do último OPME do paciente o fornecedor e a observação — só nos
 * campos ainda vazios, nunca apaga o que já foi digitado.
 */
export function copiarDadosPaciente(destino: Opme, origem: Opme): { opme: Opme; preenchidos: string[] } {
  const opme = { ...destino }
  const preenchidos: string[] = []
  if (opme.fornecedorId === null && origem.fornecedorId !== null) {
    opme.fornecedorId = origem.fornecedorId
    preenchidos.push('fornecedor')
  }
  if (!opme.observacao.trim() && origem.observacao.trim()) {
    opme.observacao = origem.observacao
    preenchidos.push('observação')
  }
  return { opme, preenchidos }
}

/** Quantas vezes cada fornecedor aparece nos OPMEs (sugestões da busca de fornecedor). */
export function usoFornecedoresEmOpme(opmes: Opme[]): Map<number, number> {
  const uso = new Map<number, number>()
  for (const o of opmes) if (o.fornecedorId !== null) uso.set(o.fornecedorId, (uso.get(o.fornecedorId) ?? 0) + 1)
  return uso
}
