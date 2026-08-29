import { FINAL_SIT } from '@/constants'
import type { HistOC, OC, Solicitacao } from '@/types'
import { diasEntre, getHoje, parseDMY } from './date'
import { dataPrazo, diasRestantes, diasSemMovimentacao, isPrevisaoDescumprida } from './oc'

export type Prioridade = 'critica' | 'alta' | 'media' | 'normal'

const DIAS_COBRANCA_SEM_RESPOSTA = 3
const DIAS_SEM_MOVIMENTACAO_CRITICA = 10
const DIAS_SEM_MOVIMENTACAO_MEDIA = 5
const DIAS_VENCIMENTO_ALTA = 2
const DIAS_PREVISAO_PROXIMA = 2
const DIAS_VENCIMENTO_MEDIA = 5

function diasDesde(ts: number): number {
  return diasEntre(new Date(ts), getHoje())
}

function diasParaPrevisao(oc: OC): number | null {
  const d = parseDMY(oc.previsaoForn)
  return d ? diasEntre(getHoje(), d) : null
}

interface Avaliacao {
  prioridade: Prioridade
  acao: string
}

/**
 * Motor de priorização automática — implementa os critérios da spec de evolução
 * do Everton (CLAUDE.md > "Evolução do módulo OCs — roadmap" > Fase 1). Não usa
 * só o status da OC: cruza prazo, previsão, atraso, cobrança/resposta e
 * movimentação, na ordem de severidade descrita na spec.
 */
function avaliar(oc: OC, sols: Solicitacao[], ultimaCobranca: HistOC | null): Avaliacao {
  if ((FINAL_SIT as readonly string[]).includes(oc.sit)) {
    return { prioridade: 'normal', acao: 'Situação final' }
  }

  const dr = diasRestantes(dataPrazo(oc, sols))
  const dsm = diasSemMovimentacao(oc)
  const cobrancaPendente = ultimaCobranca && !ultimaCobranca.respondidoEm ? ultimaCobranca : null
  const diasCobranca = cobrancaPendente ? diasDesde(cobrancaPendente.ts) : null
  const diasPrevisao = diasParaPrevisao(oc)

  // 🔴 Crítica
  if (dr !== null && dr < 0) {
    return { prioridade: 'critica', acao: `Cobrar fornecedor — OC vencida há ${Math.abs(dr)}d` }
  }
  if (isPrevisaoDescumprida(oc)) {
    return { prioridade: 'critica', acao: 'Cobrar fornecedor — previsão descumprida' }
  }
  if (diasCobranca !== null && diasCobranca >= DIAS_COBRANCA_SEM_RESPOSTA) {
    return { prioridade: 'critica', acao: `Insistir — fornecedor não respondeu há ${diasCobranca}d` }
  }
  if (dsm !== null && dsm >= DIAS_SEM_MOVIMENTACAO_CRITICA) {
    return { prioridade: 'critica', acao: `Verificar — ${dsm}d sem movimentação` }
  }

  // 🟠 Alta
  if (dr !== null && dr <= DIAS_VENCIMENTO_ALTA) {
    return { prioridade: 'alta', acao: `Acompanhar de perto — vence em ${dr}d` }
  }
  if (!oc.previsaoForn) {
    return { prioridade: 'alta', acao: 'Cobrar previsão de entrega' }
  }
  if (diasPrevisao !== null && diasPrevisao >= 0 && diasPrevisao <= DIAS_PREVISAO_PROXIMA) {
    return { prioridade: 'alta', acao: `Confirmar previsão — entrega em ${diasPrevisao}d` }
  }
  if (cobrancaPendente) {
    return { prioridade: 'alta', acao: 'Aguardar resposta da cobrança' }
  }

  // 🟡 Média
  if (dr !== null && dr <= DIAS_VENCIMENTO_MEDIA) {
    return { prioridade: 'media', acao: `Acompanhamento preventivo — vence em ${dr}d` }
  }
  if (dsm !== null && dsm >= DIAS_SEM_MOVIMENTACAO_MEDIA) {
    return { prioridade: 'media', acao: `Acompanhamento preventivo — ${dsm}d sem movimentação` }
  }

  // 🟢 Normal
  return { prioridade: 'normal', acao: 'Dentro do prazo — sem ação necessária' }
}

export function prioridadeOC(oc: OC, sols: Solicitacao[], ultimaCobranca: HistOC | null): Prioridade {
  return avaliar(oc, sols, ultimaCobranca).prioridade
}

export function acaoRecomendada(oc: OC, sols: Solicitacao[], ultimaCobranca: HistOC | null): string {
  return avaliar(oc, sols, ultimaCobranca).acao
}
