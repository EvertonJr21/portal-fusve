import { OTIF_AMOSTRA_MIN, OTIF_CLASSES, SLA_INTERNO_DIAS } from '@/constants'
import type { ContratoHeader, Fornecedor, OC, Solicitacao } from '@/types'
import { addDias, diasEntre, parseDMY } from './date'

/**
 * Motor único de indicadores de entrega (item 79/80 do CLAUDE.md) — todas as
 * telas (Desempenho de Entrega, Ranking, Ficha do Fornecedor, Ciclo Interno,
 * Dashboard Executivo, Exportar, Relatório Mensal) calculam por aqui, pra que
 * "no prazo" signifique a mesma coisa em todo lugar. Funções puras: não tocam
 * no banco nem no DOM.
 *
 * Definições (padrão de mercado, adaptado aos dados que o SoulMV exporta):
 * - Data prometida = data da OC + prazo médio do contrato ativo do fornecedor;
 *   sem contrato, data da OC + prazo padrão (ajustável na tela). É a promessa
 *   original — renegociações (previsão do fornecedor) não mudam a meta.
 * - On Time = data de entrada ≤ data prometida. Chegar antes conta como no prazo.
 * - In Full (por OC) = entregue numa única entrada, sem passar por
 *   "Parcialmente Atendida". Aproximação: os relatórios atuais não trazem
 *   quantidade recebida por item.
 * - OTIF = OCs no prazo E completas ÷ (OCs entregues + OCs abertas já vencidas).
 *   Aberta vencida conta como falha: não esperar a entrega pra penalizar o atraso.
 * - Canceladas ficam fora. Concluídas sem data válida ficam fora do cálculo e
 *   reduzem a cobertura de dados.
 * - Lead time (OC → entrada) em mediana e P90, não média.
 */

export type StatusEntrega = 'no_prazo' | 'atrasada' | 'aberta_vencida' | 'aberta_no_prazo' | 'sem_data' | 'cancelada'

export interface AvaliacaoOC {
  oc: OC
  status: StatusEntrega
  dataOC: Date | null
  dataPrometida: Date | null
  dataEntrega: Date | null
  /** Data de entrega confirmada (entrada do MV ou digitada), não estimada. */
  confirmada: boolean
  /** null = ainda não dá pra dizer (OC aberta, sem entrega). */
  inFull: boolean | null
  leadTimeDias: number | null
  /** Dias além da data prometida (entregue atrasada ou aberta vencida); 0 caso contrário. */
  diasAtraso: number
  prazoDias: number
  /** De onde veio o prazo usado: contrato ativo ou padrão. */
  prazoFonte: 'contrato' | 'padrao'
}

const CONCLUIDAS = new Set(['Atendida', 'Fechada'])

function soDigitos(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '')
}

function normalizarNome(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Prazo médio contratual por fornecedor (`forns.id` → dias), a partir dos
 * contratos ativos. Contrato não guarda o id do fornecedor do SoulMV, então o
 * casamento é por CNPJ (o mais confiável) e, sem CNPJ, pelo nome idêntico.
 * Com mais de um contrato ativo pro mesmo fornecedor, vale o menor prazo.
 */
export function prazosContratuais(contratos: ContratoHeader[], forns: Fornecedor[]): Map<number, number> {
  const porCnpj = new Map<string, number>()
  const porNome = new Map<string, number>()
  for (const f of forns) {
    const cnpj = soDigitos(f.cnpj)
    if (cnpj.length === 14) porCnpj.set(cnpj, f.id)
    porNome.set(normalizarNome(f.nome), f.id)
  }
  const prazos = new Map<number, number>()
  for (const c of contratos) {
    if (c.status !== 'Ativo' || !c.prazoMedioDias || c.prazoMedioDias <= 0) continue
    const id = porCnpj.get(soDigitos(c.fornecedorCnpj)) ?? porNome.get(normalizarNome(c.fornecedorNome))
    if (id === undefined) continue
    const atual = prazos.get(id)
    prazos.set(id, atual === undefined ? c.prazoMedioDias : Math.min(atual, c.prazoMedioDias))
  }
  return prazos
}

export function avaliarOC(oc: OC, prazos: Map<number, number>, prazoPadrao: number, hoje: Date): AvaliacaoOC {
  const contratual = oc.fornecedorId ? prazos.get(oc.fornecedorId) : undefined
  const prazoDias = contratual ?? prazoPadrao
  const base = {
    oc,
    prazoDias,
    prazoFonte: contratual !== undefined ? ('contrato' as const) : ('padrao' as const),
    confirmada: oc.dataEntregaOrigem === 'mv' || oc.dataEntregaOrigem === 'manual',
  }
  const dataOC = parseDMY(oc.dataSolic)
  const vazio = { dataOC, dataPrometida: null, dataEntrega: null, inFull: null, leadTimeDias: null, diasAtraso: 0 }

  if (oc.sit === 'Cancelada') return { ...base, ...vazio, status: 'cancelada' }
  if (!dataOC) return { ...base, ...vazio, status: 'sem_data' }

  const dataPrometida = addDias(dataOC, prazoDias)

  if (!CONCLUIDAS.has(oc.sit)) {
    // Parcial continua aberta mesmo com data registrada — o pedido ainda não chegou completo.
    const vencida = hoje > dataPrometida
    return {
      ...base,
      dataOC,
      dataPrometida,
      dataEntrega: null,
      inFull: vencida ? false : null,
      leadTimeDias: null,
      diasAtraso: vencida ? diasEntre(dataPrometida, hoje) : 0,
      status: vencida ? 'aberta_vencida' : 'aberta_no_prazo',
    }
  }

  const entrega = parseDMY(oc.dataEntregaReal)
  // Entrega antes da OC ou no futuro = dado inválido, fica fora do cálculo.
  if (!entrega || entrega < dataOC || entrega > hoje) {
    return { ...base, ...vazio, dataOC, dataPrometida, status: 'sem_data' }
  }
  const noPrazo = entrega <= dataPrometida
  return {
    ...base,
    dataOC,
    dataPrometida,
    dataEntrega: entrega,
    inFull: !oc.dataParcial && oc.qtdEntradas <= 1,
    leadTimeDias: diasEntre(dataOC, entrega),
    diasAtraso: noPrazo ? 0 : diasEntre(dataPrometida, entrega),
    status: noPrazo ? 'no_prazo' : 'atrasada',
  }
}

export function avaliarOCs(ocs: OC[], prazos: Map<number, number>, prazoPadrao: number, hoje: Date): AvaliacaoOC[] {
  return ocs.map((o) => avaliarOC(o, prazos, prazoPadrao, hoje))
}

/** Percentil por interpolação linear (p entre 0 e 1). */
export function percentil(valores: number[], p: number): number | null {
  if (!valores.length) return null
  const ord = [...valores].sort((a, b) => a - b)
  const pos = (ord.length - 1) * p
  const baixo = Math.floor(pos)
  const alto = Math.ceil(pos)
  return ord[baixo] + (ord[alto] - ord[baixo]) * (pos - baixo)
}

export interface ResumoEntrega {
  /** Denominador do OTIF/On Time: entregues + abertas vencidas. */
  avaliadas: number
  entregues: number
  noPrazo: number
  atrasadas: number
  abertasVencidas: number
  abertasNoPrazo: number
  completas: number
  perfeitas: number
  otif: number | null
  onTime: number | null
  inFull: number | null
  leadTimeMediana: number | null
  leadTimeP90: number | null
  /** OCs concluídas (Atendida/Fechada) — base da cobertura de dados. */
  concluidas: number
  semData: number
  confirmadas: number
  /** % das concluídas com data de entrega válida. */
  cobertura: number | null
  /** % das concluídas com data confirmada (MV ou manual), não estimada. */
  coberturaConfirmada: number | null
}

export function resumir(avaliacoes: AvaliacaoOC[]): ResumoEntrega {
  const conta = (s: StatusEntrega) => avaliacoes.filter((a) => a.status === s).length
  const entreguesLista = avaliacoes.filter((a) => a.status === 'no_prazo' || a.status === 'atrasada')
  const noPrazo = conta('no_prazo')
  const atrasadas = conta('atrasada')
  const abertasVencidas = conta('aberta_vencida')
  const entregues = noPrazo + atrasadas
  const avaliadas = entregues + abertasVencidas
  const completas = entreguesLista.filter((a) => a.inFull).length
  const perfeitas = entreguesLista.filter((a) => a.status === 'no_prazo' && a.inFull).length
  const leads = entreguesLista.map((a) => a.leadTimeDias as number)
  const concluidas = avaliacoes.filter((a) => CONCLUIDAS.has(a.oc.sit)).length
  const semData = avaliacoes.filter((a) => a.status === 'sem_data' && CONCLUIDAS.has(a.oc.sit)).length
  const confirmadas = entreguesLista.filter((a) => a.confirmada).length

  return {
    avaliadas,
    entregues,
    noPrazo,
    atrasadas,
    abertasVencidas,
    abertasNoPrazo: conta('aberta_no_prazo'),
    completas,
    perfeitas,
    otif: avaliadas ? perfeitas / avaliadas : null,
    onTime: avaliadas ? noPrazo / avaliadas : null,
    inFull: entregues ? completas / entregues : null,
    leadTimeMediana: percentil(leads, 0.5),
    leadTimeP90: percentil(leads, 0.9),
    concluidas,
    semData,
    confirmadas,
    cobertura: concluidas ? entregues / concluidas : null,
    coberturaConfirmada: concluidas ? confirmadas / concluidas : null,
  }
}

export interface ClasseFornecedor {
  classe: (typeof OTIF_CLASSES)[number]['classe']
  acao: string
}

/** Nota A–D pelo OTIF. Abaixo da amostra mínima, sem nota (null). */
export function classificar(resumo: ResumoEntrega): ClasseFornecedor | null {
  if (resumo.avaliadas < OTIF_AMOSTRA_MIN || resumo.otif === null) return null
  const pct = resumo.otif * 100
  const c = OTIF_CLASSES.find((x) => pct >= x.min) ?? OTIF_CLASSES[OTIF_CLASSES.length - 1]
  return { classe: c.classe, acao: c.acao }
}

export interface DesempenhoFornecedor {
  fornecedorId: number
  fornecedorNome: string
  totalOCs: number
  resumo: ResumoEntrega
  classe: ClasseFornecedor | null
  avaliacoes: AvaliacaoOC[]
}

export function desempenhoPorFornecedor(avaliacoes: AvaliacaoOC[], forns: Fornecedor[]): DesempenhoFornecedor[] {
  const grupos = new Map<number, AvaliacaoOC[]>()
  for (const a of avaliacoes) {
    if (a.status === 'cancelada') continue
    const id = a.oc.fornecedorId ?? 0
    if (!grupos.has(id)) grupos.set(id, [])
    grupos.get(id)!.push(a)
  }
  const nomes = new Map(forns.map((f) => [f.id, f.nome]))
  return [...grupos.entries()].map(([fornecedorId, lista]) => {
    const resumo = resumir(lista)
    return {
      fornecedorId,
      fornecedorNome: nomes.get(fornecedorId) ?? lista[0].oc.fornecedorNome ?? '—',
      totalOCs: lista.length,
      resumo,
      classe: classificar(resumo),
      avaliacoes: lista,
    }
  })
}

/** Ordem: pior OTIF primeiro; sem nota no fim. */
export function ordenarPorRisco(lista: DesempenhoFornecedor[]): DesempenhoFornecedor[] {
  return [...lista].sort((a, b) => {
    if (!a.classe !== !b.classe) return a.classe ? -1 : 1
    const oa = a.resumo.otif ?? 2
    const ob = b.resumo.otif ?? 2
    return oa !== ob ? oa - ob : b.resumo.avaliadas - a.resumo.avaliadas
  })
}

export interface FaixaBacklog {
  rotulo: string
  quantidade: number
}

/** OCs abertas além da data prometida, por faixa de dias de atraso. */
export function backlogVencido(avaliacoes: AvaliacaoOC[]): FaixaBacklog[] {
  const faixas = [
    { rotulo: '1–7 dias', min: 1, max: 7 },
    { rotulo: '8–15 dias', min: 8, max: 15 },
    { rotulo: '16–30 dias', min: 16, max: 30 },
    { rotulo: 'Mais de 30 dias', min: 31, max: Infinity },
  ]
  const vencidas = avaliacoes.filter((a) => a.status === 'aberta_vencida')
  return faixas.map((f) => ({
    rotulo: f.rotulo,
    quantidade: vencidas.filter((a) => a.diasAtraso >= f.min && a.diasAtraso <= f.max).length,
  }))
}

export interface ConfiabilidadePrevisao {
  total: number
  cumpridas: number
  pct: number | null
}

/**
 * Previsão registrada pelo comprador × entrega efetiva. Indicador separado do
 * On Time: um fornecedor pode cumprir o prazo e não a previsão, ou o contrário.
 */
export function confiabilidadePrevisao(avaliacoes: AvaliacaoOC[]): ConfiabilidadePrevisao {
  const comPrevisao = avaliacoes.filter((a) => a.dataEntrega && parseDMY(a.oc.previsaoForn))
  const cumpridas = comPrevisao.filter((a) => a.dataEntrega! <= parseDMY(a.oc.previsaoForn)!).length
  return { total: comPrevisao.length, cumpridas, pct: comPrevisao.length ? cumpridas / comPrevisao.length : null }
}

export interface CicloInterno {
  total: number
  dentroMeta: number
  pct: number | null
  mediana: number | null
  p90: number | null
  meta: number
}

/**
 * Ciclo interno de compras: Solicitação → OC. Mede o setor de compras, não o
 * fornecedor — por isso nunca entra no OTIF. Só OCs vinculadas a uma solicitação.
 */
export function cicloInterno(ocs: OC[], sols: Solicitacao[], meta = SLA_INTERNO_DIAS): CicloInterno {
  const porId = new Map(sols.map((s) => [s.id, s]))
  const dias: number[] = []
  for (const o of ocs) {
    if (o.sit === 'Cancelada' || !o.solicitacaoId) continue
    const dSol = parseDMY(porId.get(o.solicitacaoId)?.data)
    const dOC = parseDMY(o.dataSolic)
    if (!dSol || !dOC || dOC < dSol) continue
    dias.push(diasEntre(dSol, dOC))
  }
  const dentroMeta = dias.filter((d) => d <= meta).length
  return {
    total: dias.length,
    dentroMeta,
    pct: dias.length ? dentroMeta / dias.length : null,
    mediana: percentil(dias, 0.5),
    p90: percentil(dias, 0.9),
    meta,
  }
}

/** Filtro de período pela data da OC (`dias` = null → tudo). */
export function filtrarPeriodo(ocs: OC[], dias: number | null, hoje: Date): OC[] {
  if (dias === null) return ocs
  const limite = addDias(hoje, -dias)
  return ocs.filter((o) => {
    const d = parseDMY(o.dataSolic)
    return !!d && d >= limite
  })
}

export function formatarPct(v: number | null, casas = 0): string {
  return v === null ? '—' : `${(v * 100).toFixed(casas)}%`
}

export function formatarDias(v: number | null): string {
  return v === null ? '—' : `${Number.isInteger(v) ? v : v.toFixed(1).replace('.', ',')}d`
}

export interface GrupoAConfirmar {
  /** null = OC ainda sem solicitação vinculada. */
  solicitacaoId: number | null
  avaliacoes: AvaliacaoOC[]
}

/**
 * OCs concluídas cuja data de entrega não foi confirmada (estimada pelo dia da
 * importação do relatório de OCs, ou ausente), agrupadas pela solicitação — é
 * por solicitação que o Acompanhamento de Compras sai do MV. Solicitações com
 * mais OCs pendentes primeiro; OCs sem vínculo num grupo à parte, por último.
 */
export function entregasAConfirmar(avaliacoes: AvaliacaoOC[]): GrupoAConfirmar[] {
  const grupos = new Map<number | null, AvaliacaoOC[]>()
  for (const a of avaliacoes) {
    if (!CONCLUIDAS.has(a.oc.sit) || a.confirmada) continue
    const chave = a.oc.solicitacaoId ?? null
    const lista = grupos.get(chave) ?? []
    lista.push(a)
    grupos.set(chave, lista)
  }
  return [...grupos.entries()]
    .map(([solicitacaoId, lista]) => ({ solicitacaoId, avaliacoes: lista.sort((x, y) => x.oc.id - y.oc.id) }))
    .sort((a, b) => {
      if ((a.solicitacaoId === null) !== (b.solicitacaoId === null)) return a.solicitacaoId === null ? 1 : -1
      return b.avaliacoes.length - a.avaliacoes.length || (a.solicitacaoId ?? 0) - (b.solicitacaoId ?? 0)
    })
}
