import { FINAL_SIT } from '@/constants'
import type { Fornecedor, HistOC, OC, Solicitacao } from '@/types'
import { diasEntre, parseDMY } from './date'
import { dataPrazo, statusPrazo } from './oc'

export interface ScoreFornecedor {
  fornecedorId: number
  fornecedorNome: string
  totalOCs: number
  ocsAbertas: number
  ocsConcluidas: number
  ocsAtrasadas: number
  taxaAtraso: number | null
  tempoMedioAtrasoDias: number | null
  tempoMedioEntregaDias: number | null
  cumprimentoPrazoPct: number | null
  cumprimentoPrevisaoPct: number | null
  responsividadePct: number | null
  tempoMedioRespostaHoras: number | null
  totalCobrancas: number
  score: number
  ocs: OC[]
}

function media(valores: number[]): number | null {
  if (!valores.length) return null
  return valores.reduce((s, v) => s + v, 0) / valores.length
}

/**
 * Pontuação do tempo médio de resposta: cheia até 4h, decai linearmente até
 * zero em 48h. Curva inicial — os pesos/curva são "configuráveis no futuro"
 * (spec item 8).
 */
function pontuarTempoResposta(horas: number): number {
  if (horas <= 4) return 1
  if (horas >= 48) return 0
  return 1 - (horas - 4) / (48 - 4)
}

/**
 * Calcula o score 0-100 de um fornecedor a partir das OCs e cobranças já
 * carregadas no app — nenhuma fonte de dado nova. Pesos exatos da spec do
 * Everton: 35 prazo / 25 taxa de atraso / 15 previsão / 15 responsividade /
 * 10 tempo de resposta.
 */
export function calcularScoreFornecedor(
  forn: Fornecedor,
  todasOCs: OC[],
  sols: Solicitacao[],
  cobrancasDoFornecedor: HistOC[],
): ScoreFornecedor {
  const ocs = todasOCs.filter((o) => o.fornecedorId === forn.id)
  const naoCanceladas = ocs.filter((o) => o.sit !== 'Cancelada')
  const concluidas = naoCanceladas.filter((o) => FINAL_SIT.includes(o.sit as (typeof FINAL_SIT)[number]))
  const abertas = naoCanceladas.filter((o) => !FINAL_SIT.includes(o.sit as (typeof FINAL_SIT)[number]))
  const entregues = naoCanceladas.filter((o) => o.dataEntregaReal)

  const atrasadas = naoCanceladas.filter((o) => {
    const dp = dataPrazo(o, sols)
    if (o.dataEntregaReal) {
      const dEntrega = parseDMY(o.dataEntregaReal)
      const dPrazoFinal = dp ? new Date(dp) : null
      if (dPrazoFinal) dPrazoFinal.setDate(dPrazoFinal.getDate() + 15)
      return !!dEntrega && !!dPrazoFinal && dEntrega > dPrazoFinal
    }
    return statusPrazo(dp, o.sit) === 'vencida'
  })

  const diasAtrasoLista = atrasadas
    .map((o) => {
      const dp = dataPrazo(o, sols)
      if (!dp) return null
      const dPrazoFinal = new Date(dp)
      dPrazoFinal.setDate(dPrazoFinal.getDate() + 15)
      const dRef = o.dataEntregaReal ? parseDMY(o.dataEntregaReal) : new Date()
      return dRef ? diasEntre(dPrazoFinal, dRef) : null
    })
    .filter((d): d is number => d !== null && d > 0)

  const entreguesNoPrazoLista = entregues.filter((o) => {
    const dp = dataPrazo(o, sols)
    const dEntrega = parseDMY(o.dataEntregaReal)
    if (!dp || !dEntrega) return null
    const dPrazoFinal = new Date(dp)
    dPrazoFinal.setDate(dPrazoFinal.getDate() + 15)
    return dEntrega <= dPrazoFinal
  })

  const tempoEntregaLista = entregues
    .map((o) => {
      const dSolic = parseDMY(o.dataSolic)
      const dEntrega = parseDMY(o.dataEntregaReal)
      return dSolic && dEntrega ? diasEntre(dSolic, dEntrega) : null
    })
    .filter((d): d is number => d !== null)

  const comPrevisao = entregues.filter((o) => o.previsaoForn)
  const previsaoCumprida = comPrevisao.filter((o) => {
    const dPrevisao = parseDMY(o.previsaoForn)
    const dEntrega = parseDMY(o.dataEntregaReal)
    return dPrevisao && dEntrega && dEntrega <= dPrevisao
  })

  const respondidas = cobrancasDoFornecedor.filter((h) => h.respondidoEm)
  const tempoRespostaLista = respondidas.map((h) => (h.respondidoEm! - h.ts) / 3_600_000)

  const cumprimentoPrazoPct = entregues.length ? entreguesNoPrazoLista.length / entregues.length : null
  const taxaAtraso = naoCanceladas.length ? atrasadas.length / naoCanceladas.length : null
  const cumprimentoPrevisaoPct = comPrevisao.length ? previsaoCumprida.length / comPrevisao.length : null
  const responsividadePct = cobrancasDoFornecedor.length ? respondidas.length / cobrancasDoFornecedor.length : null
  const tempoMedioRespostaHoras = media(tempoRespostaLista)

  const partes: { peso: number; valor: number }[] = []
  if (cumprimentoPrazoPct !== null) partes.push({ peso: 35, valor: cumprimentoPrazoPct })
  if (taxaAtraso !== null) partes.push({ peso: 25, valor: 1 - taxaAtraso })
  if (cumprimentoPrevisaoPct !== null) partes.push({ peso: 15, valor: cumprimentoPrevisaoPct })
  if (responsividadePct !== null) partes.push({ peso: 15, valor: responsividadePct })
  if (tempoMedioRespostaHoras !== null) partes.push({ peso: 10, valor: pontuarTempoResposta(tempoMedioRespostaHoras) })

  const pesoTotal = partes.reduce((s, p) => s + p.peso, 0)
  const score = pesoTotal > 0 ? Math.round(partes.reduce((s, p) => s + p.peso * p.valor, 0) / pesoTotal * 100) : 0

  return {
    fornecedorId: forn.id,
    fornecedorNome: forn.nome,
    totalOCs: naoCanceladas.length,
    ocsAbertas: abertas.length,
    ocsConcluidas: concluidas.length,
    ocsAtrasadas: atrasadas.length,
    taxaAtraso,
    tempoMedioAtrasoDias: media(diasAtrasoLista),
    tempoMedioEntregaDias: media(tempoEntregaLista),
    cumprimentoPrazoPct,
    cumprimentoPrevisaoPct,
    responsividadePct,
    tempoMedioRespostaHoras,
    totalCobrancas: cobrancasDoFornecedor.length,
    score,
    ocs,
  }
}

export function calcularScoresTodos(forns: Fornecedor[], ocs: OC[], sols: Solicitacao[], cobrancas: HistOC[]): ScoreFornecedor[] {
  const cobrancasPorOC = new Map<number, HistOC[]>()
  for (const h of cobrancas) {
    if (!cobrancasPorOC.has(h.ocId)) cobrancasPorOC.set(h.ocId, [])
    cobrancasPorOC.get(h.ocId)!.push(h)
  }
  const ocPorFornecedor = new Map<number, Set<number>>()
  for (const o of ocs) {
    if (!o.fornecedorId) continue
    if (!ocPorFornecedor.has(o.fornecedorId)) ocPorFornecedor.set(o.fornecedorId, new Set())
    ocPorFornecedor.get(o.fornecedorId)!.add(o.id)
  }

  return forns
    .filter((f) => ocPorFornecedor.has(f.id))
    .map((f) => {
      const ocIds = ocPorFornecedor.get(f.id) ?? new Set<number>()
      const cobrancasDoFornecedor = cobrancas.filter((h) => ocIds.has(h.ocId))
      return calcularScoreFornecedor(f, ocs, sols, cobrancasDoFornecedor)
    })
}

/** Fornecedores com taxa de atraso ≥1,5× a média geral — identificação automática (spec item 10). */
export function fornecedoresProblematicos(scores: ScoreFornecedor[]): (ScoreFornecedor & { multiploMedia: number })[] {
  const comTaxa = scores.filter((s) => s.taxaAtraso !== null && s.totalOCs >= 3)
  if (!comTaxa.length) return []
  const mediaGeral = media(comTaxa.map((s) => s.taxaAtraso as number)) ?? 0
  if (mediaGeral <= 0) return []
  return comTaxa
    .filter((s) => (s.taxaAtraso as number) >= mediaGeral * 1.5)
    .map((s) => ({ ...s, multiploMedia: (s.taxaAtraso as number) / mediaGeral }))
    .sort((a, b) => b.multiploMedia - a.multiploMedia)
}
