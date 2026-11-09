import { FINAL_SIT } from '@/constants'
import type { HistOC, OC } from '@/types'
import { diasEntre, getHoje, parseDMY } from './date'
import { diasSemMovimentacao, isPrevisaoDescumprida } from './oc'

export type Prioridade = 'critica' | 'alta' | 'media' | 'normal'

const DIAS_COBRANCA_SEM_RESPOSTA = 3
const DIAS_SEM_MOVIMENTACAO_CRITICA = 10
const DIAS_SEM_MOVIMENTACAO_MEDIA = 5
const DIAS_VENCIMENTO_ALTA = 2
/** Quantos dias antes da previsão a OC volta pra "Precisa de ação". */
const DIAS_AVISO_ENTREGA = 1
const DIAS_VENCIMENTO_MEDIA = 5

function diasDesde(ts: number): number {
  return diasEntre(new Date(ts), getHoje())
}

function diasParaPrevisao(oc: OC): number | null {
  const d = parseDMY(oc.previsaoForn)
  return d ? diasEntre(getHoje(), d) : null
}

export interface AvaliacaoPrioridade {
  prioridade: Prioridade
  acao: string
}

/**
 * Motor de priorização automática — implementa os critérios da spec de evolução
 * do Everton (CLAUDE.md > "Evolução do módulo OCs — roadmap" > Fase 1). Não usa
 * só o status da OC: cruza prazo, previsão, atraso, cobrança/resposta e
 * movimentação, na ordem de severidade descrita na spec.
 *
 * `diasPrazo` = dias até a data prometida (data da OC + prazo do contrato ou
 * padrão — a mesma do Desempenho de Entrega, `kpis.ts`); negativo = vencida.
 */
export function avaliarPrioridade(oc: OC, diasPrazo: number | null, ultimaCobranca: HistOC | null): AvaliacaoPrioridade {
  if ((FINAL_SIT as readonly string[]).includes(oc.sit)) {
    return { prioridade: 'normal', acao: 'Situação final' }
  }

  const dr = diasPrazo
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

  // Previsão já registrada pelo comprador, sem cobrança em aberto e dentro do
  // prazo prometido: não há o que "confirmar" — só acompanhar. A OC volta a
  // pedir ação 1 dia antes da entrega (e no próprio dia), pra conferir com o
  // fornecedor/recebimento. Previsão depois da data prometida não entra aqui:
  // aí a OC vai atrasar e as regras de prazo abaixo continuam valendo.
  if (diasPrevisao !== null && diasPrevisao >= 0 && !cobrancaPendente && (dr === null || diasPrevisao <= dr)) {
    if (diasPrevisao === 0) return { prioridade: 'alta', acao: 'Entrega prevista para hoje — conferir recebimento' }
    if (diasPrevisao <= DIAS_AVISO_ENTREGA) return { prioridade: 'alta', acao: 'Entrega amanhã — confirmar com o fornecedor' }
    return { prioridade: 'normal', acao: `Previsão confirmada — entrega em ${diasPrevisao}d (aviso 1 dia antes)` }
  }

  // 🟠 Alta
  if (dr !== null && dr <= DIAS_VENCIMENTO_ALTA) {
    return { prioridade: 'alta', acao: `Acompanhar de perto — vence em ${dr}d` }
  }
  if (!oc.previsaoForn) {
    return { prioridade: 'alta', acao: 'Cobrar previsão de entrega' }
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
