import { FINAL_SIT, PRAZO } from '@/constants'
import type { HistOC, OC, Solicitacao } from '@/types'
import { addDias, diasEntre, toInput } from './date'
import type { AvaliacaoOC } from './kpis'
import { dataPrazo, diasSemMovimentacao, isPrevisaoDescumprida } from './oc'
import { avaliarPrioridade, type Prioridade } from './prioridade'

/**
 * Regras da tela de Ordens de Compra (item 82 do CLAUDE.md) — funções puras,
 * testadas em `ocLista.test.ts`. O prazo de cada OC é o MESMO do Desempenho de
 * Entrega (data da OC + prazo do contrato ativo do fornecedor, senão o padrão),
 * vindo de `AvaliacaoOC.dataPrometida`. O prazo institucional (solicitação + 15)
 * continua calculado, mas só como informação secundária.
 */

export type VisaoOC = 'acao' | 'vencidas' | 'sem_previsao' | 'parciais' | 'a_confirmar' | 'abertas' | 'todas'

export const VISOES_OC: { id: VisaoOC; label: string; dica: string }[] = [
  { id: 'acao', label: 'Precisa de ação', dica: 'OCs abertas com prioridade crítica ou alta — da mais urgente pra menos' },
  { id: 'vencidas', label: 'Vencidas', dica: 'Abertas além da data prometida' },
  { id: 'sem_previsao', label: 'Sem previsão', dica: 'Abertas sem previsão do fornecedor registrada' },
  { id: 'parciais', label: 'Parciais', dica: 'Em "Parcialmente Atendida"' },
  { id: 'a_confirmar', label: 'Entrega a confirmar', dica: 'Atendidas com data de entrega estimada ou sem data — importe o Acompanhamento' },
  { id: 'abertas', label: 'Abertas', dica: 'Todas as OCs que ainda não chegaram ao fim' },
  { id: 'todas', label: 'Todas', dica: 'Todas as OCs do hospital ativo' },
]

export type StatusPrazoLista = 'vencida' | 'urgente' | 'ok' | 'entregue' | 'cancelada' | 'sem_data'

/** Dias até vencer que já contam como "urgente" (mesmo limite do semáforo antigo). */
export const DIAS_URGENTE = 3

export interface LinhaOC {
  oc: OC
  avaliacao: AvaliacaoOC
  sol: Solicitacao | null
  aberta: boolean
  /** Dias até a data prometida (negativo = vencida). null pra OC fechada ou sem data. */
  diasPrazo: number | null
  statusPrazo: StatusPrazoLista
  prazoInstitucional: Date | null
  ultimaCobranca: HistOC | null
  cobrancaPendente: boolean
  diasSemMov: number | null
  prioridade: Prioridade | null
  acao: string
  previsaoDescumprida: boolean
}

const ehFinal = (sit: string) => (FINAL_SIT as readonly string[]).includes(sit)

export function montarLinhas(
  avaliacoes: AvaliacaoOC[],
  sols: Solicitacao[],
  ultimas: Map<number, HistOC>,
  hoje: Date,
): LinhaOC[] {
  const solsPorId = new Map(sols.map((s) => [s.id, s]))
  return avaliacoes.map((avaliacao) => {
    const oc = avaliacao.oc
    const aberta = !ehFinal(oc.sit)
    const sol = oc.solicitacaoId ? (solsPorId.get(oc.solicitacaoId) ?? null) : null
    const diasPrazo = aberta && avaliacao.dataPrometida ? diasEntre(hoje, avaliacao.dataPrometida) : null
    const statusPrazo: StatusPrazoLista =
      oc.sit === 'Cancelada'
        ? 'cancelada'
        : !aberta
          ? 'entregue'
          : diasPrazo === null
            ? 'sem_data'
            : diasPrazo < 0
              ? 'vencida'
              : diasPrazo <= DIAS_URGENTE
                ? 'urgente'
                : 'ok'
    const ultimaCobranca = aberta ? (ultimas.get(oc.id) ?? null) : null
    const dpInst = dataPrazo(oc, sols)
    const prio = aberta ? avaliarPrioridade(oc, diasPrazo, ultimaCobranca) : null
    return {
      oc,
      avaliacao,
      sol,
      aberta,
      diasPrazo,
      statusPrazo,
      prazoInstitucional: dpInst ? addDias(dpInst, PRAZO) : null,
      ultimaCobranca,
      cobrancaPendente: !!ultimaCobranca && !ultimaCobranca.respondidoEm,
      diasSemMov: aberta ? diasSemMovimentacao(oc) : null,
      prioridade: prio?.prioridade ?? null,
      acao: prio?.acao ?? '',
      previsaoDescumprida: aberta && isPrevisaoDescumprida(oc),
    }
  })
}

export function naVisao(l: LinhaOC, visao: VisaoOC): boolean {
  switch (visao) {
    case 'acao':
      return l.aberta && (l.prioridade === 'critica' || l.prioridade === 'alta')
    case 'vencidas':
      return l.statusPrazo === 'vencida'
    case 'sem_previsao':
      return l.aberta && !l.oc.previsaoForn
    case 'parciais':
      return l.oc.sit === 'Parcialmente Atendida'
    case 'a_confirmar':
      return (l.oc.sit === 'Atendida' || l.oc.sit === 'Fechada') && !l.avaliacao.confirmada
    case 'abertas':
      return l.aberta
    case 'todas':
      return true
  }
}

export function contarVisoes(linhas: LinhaOC[]): Record<VisaoOC, number> {
  const c = { acao: 0, vencidas: 0, sem_previsao: 0, parciais: 0, a_confirmar: 0, abertas: 0, todas: 0 }
  for (const l of linhas) for (const v of VISOES_OC) if (naVisao(l, v.id)) c[v.id]++
  return c
}

export interface FiltrosOC {
  busca: string
  situacao: string
  estoque: string
  motivo: string
  /** '' | 'com' | 'sem' — OC vinculada a uma solicitação */
  vinculo: '' | 'com' | 'sem'
  /** Período pela data da OC, yyyy-mm-dd ('' = aberto) */
  de: string
  ate: string
  /** Previsão do fornecedor exatamente nesta data, yyyy-mm-dd */
  previsao: string
}

export const FILTROS_VAZIOS: FiltrosOC = { busca: '', situacao: '', estoque: '', motivo: '', vinculo: '', de: '', ate: '', previsao: '' }

/** Valor do filtro de motivo pra "OC sem motivo registrado". */
export const SEM_MOTIVO = '__sem__'

export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function filtrarLinhas(linhas: LinhaOC[], f: FiltrosOC): LinhaOC[] {
  const termos = normalizar(f.busca).split(/\s+/).filter(Boolean)
  return linhas.filter((l) => {
    const o = l.oc
    if (f.situacao && o.sit !== f.situacao) return false
    if (f.estoque && o.estoque !== f.estoque) return false
    if (f.motivo === SEM_MOTIVO ? !!o.motivoAtraso : f.motivo && o.motivoAtraso !== f.motivo) return false
    if (f.vinculo === 'com' && !o.solicitacaoId) return false
    if (f.vinculo === 'sem' && o.solicitacaoId) return false
    if (f.de || f.ate) {
      const d = toInput(o.dataSolic)
      if (!d || (f.de && d < f.de) || (f.ate && d > f.ate)) return false
    }
    if (f.previsao) {
      const ativa = o.sit === 'Parcialmente Atendida' && o.previsaoForn2 ? [o.previsaoForn, o.previsaoForn2] : [o.previsaoForn]
      if (!ativa.some((p) => toInput(p) === f.previsao)) return false
    }
    if (termos.length) {
      const alvo = normalizar(
        [o.id, o.fornecedorNome, o.solicitacaoId ?? '', l.sol?.produto ?? '', o.estoque ?? ''].join(' '),
      )
      if (!termos.every((t) => alvo.includes(t))) return false
    }
    return true
  })
}

export function filtrosAtivos(f: FiltrosOC): number {
  return (Object.keys(f) as (keyof FiltrosOC)[]).filter((k) => k !== 'busca' && f[k]).length
}

export type ChaveOrdem = 'prioridade' | 'id' | 'dataOC' | 'fornecedor' | 'situacao' | 'prazo'
export type DirOrdem = 1 | -1

const PESO_PRIORIDADE: Record<Prioridade, number> = { critica: 0, alta: 1, media: 2, normal: 3 }

export function ordenarLinhas(linhas: LinhaOC[], chave: ChaveOrdem, dir: DirOrdem): LinhaOC[] {
  const prazo = (l: LinhaOC) => l.diasPrazo ?? Number.MAX_SAFE_INTEGER
  const cmp = (a: LinhaOC, b: LinhaOC): number => {
    switch (chave) {
      case 'prioridade': {
        const pa = a.prioridade ? PESO_PRIORIDADE[a.prioridade] : 9
        const pb = b.prioridade ? PESO_PRIORIDADE[b.prioridade] : 9
        // Empate: mais atrasada/mais perto de vencer primeiro, depois a OC mais antiga.
        return pa - pb || prazo(a) - prazo(b) || a.oc.id - b.oc.id
      }
      case 'id':
        return a.oc.id - b.oc.id
      case 'dataOC':
        return (a.avaliacao.dataOC?.getTime() ?? 0) - (b.avaliacao.dataOC?.getTime() ?? 0) || a.oc.id - b.oc.id
      case 'fornecedor':
        return a.oc.fornecedorNome.localeCompare(b.oc.fornecedorNome) || a.oc.id - b.oc.id
      case 'situacao':
        return a.oc.sit.localeCompare(b.oc.sit) || a.oc.id - b.oc.id
      case 'prazo':
        return prazo(a) - prazo(b) || a.oc.id - b.oc.id
    }
  }
  // Prioridade tem uma ordem "natural" (crítica primeiro) — a direção só inverte as outras chaves.
  return [...linhas].sort((a, b) => (chave === 'prioridade' ? cmp(a, b) : cmp(a, b) * dir))
}

export interface GrupoFornecedor {
  chave: string
  fornecedorId: number | null
  fornecedorNome: string
  linhas: LinhaOC[]
  vencidas: number
}

/** Agrupa mantendo a ordem atual das linhas; grupos com OC vencida primeiro, depois mais OCs. */
export function agruparPorFornecedor(linhas: LinhaOC[]): GrupoFornecedor[] {
  const grupos = new Map<string, GrupoFornecedor>()
  for (const l of linhas) {
    const chave = l.oc.fornecedorId ? `id:${l.oc.fornecedorId}` : `nome:${l.oc.fornecedorNome}`
    let g = grupos.get(chave)
    if (!g) {
      g = { chave, fornecedorId: l.oc.fornecedorId || null, fornecedorNome: l.oc.fornecedorNome, linhas: [], vencidas: 0 }
      grupos.set(chave, g)
    }
    g.linhas.push(l)
    if (l.statusPrazo === 'vencida') g.vencidas++
  }
  return [...grupos.values()].sort(
    (a, b) => b.vencidas - a.vencidas || b.linhas.length - a.linhas.length || a.fornecedorNome.localeCompare(b.fornecedorNome),
  )
}

/** Texto curto do prazo pra badge: "Venc. 3d", "Vence hoje", "5d rest.", "Entregue". */
export function textoPrazo(l: LinhaOC): string {
  switch (l.statusPrazo) {
    case 'cancelada':
      return 'Cancelada'
    case 'entregue':
      return 'Entregue'
    case 'sem_data':
      return '—'
    default:
      if (l.diasPrazo === null) return '—'
      if (l.diasPrazo < 0) return `Venc. ${Math.abs(l.diasPrazo)}d`
      if (l.diasPrazo === 0) return 'Vence hoje'
      return `${l.diasPrazo}d rest.`
  }
}

/** "há 3d", "hoje" — pra última cobrança. */
export function haQuantoTempo(ts: number, hoje: Date): string {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const dias = diasEntre(d, hoje)
  return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias}d`
}

/** Mapeia o antigo `?rapido=` (links salvos, Dashboard Executivo) pra uma visão nova. */
export function visaoDeParametro(rapido: string | null, visao: string | null): VisaoOC | null {
  if (visao && VISOES_OC.some((v) => v.id === visao)) return visao as VisaoOC
  const legado: Record<string, VisaoOC> = {
    vencidas: 'vencidas',
    sem_previsao: 'sem_previsao',
    parciais: 'parciais',
    previsao_descumprida: 'acao',
    urgentes: 'abertas',
    sem_movimentacao: 'abertas',
  }
  return rapido ? (legado[rapido] ?? null) : null
}
