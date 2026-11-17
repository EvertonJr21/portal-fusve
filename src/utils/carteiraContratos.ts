import { ALERTA_CRITICO_DIAS, ALERTA_VENCIMENTO_DIAS } from '@/constants'
import type { ContratoHeader } from '@/types'
import { diasParaVencer } from './contrato'

/**
 * Relatório gerencial de contratos (item 112): quais contratos ativos vencem,
 * quando e onde estão. Sem valores em reais — os contratos do portal são
 * referência de produtos e preços, sem pedido vinculado.
 */

export type FaixaPrazo = 'vencido' | 'critico' | 'atencao' | 'normal' | 'sem_data'
export type UnidadeFiltro = 'todas' | 'huv' | 'mkr'

/** Até 30 dias: crítico; 31 a 90: atenção; acima de 90: normal; abaixo de 0: vencido. */
export function faixaPrazo(dias: number | null): FaixaPrazo {
  if (dias === null) return 'sem_data'
  if (dias < 0) return 'vencido'
  if (dias <= ALERTA_CRITICO_DIAS) return 'critico'
  if (dias <= ALERTA_VENCIMENTO_DIAS) return 'atencao'
  return 'normal'
}

export const ROTULO_FAIXA: Record<FaixaPrazo, string> = {
  vencido: 'Vencido',
  critico: `Até ${ALERTA_CRITICO_DIAS} dias`,
  atencao: `${ALERTA_CRITICO_DIAS + 1} a ${ALERTA_VENCIMENTO_DIAS} dias`,
  normal: `Mais de ${ALERTA_VENCIMENTO_DIAS} dias`,
  sem_data: 'Sem data de término',
}

export const ROTULO_UNIDADE: Record<ContratoHeader['hospitalId'], string> = { huv: 'HUV', mkr: 'HMK', ambos: 'HUV e HMK' }

export interface LinhaCarteira {
  contrato: ContratoHeader
  dias: number | null
  faixa: FaixaPrazo
  itens: number | null
  comodatos: number
}

export interface Contagem {
  nome: string
  quantidade: number
  pct: number
}

export interface Carteira {
  /** Contratos ativos da unidade, do que vence primeiro ao último. */
  linhas: LinhaCarteira[]
  /** Ativos vencidos ou que vencem em até 90 dias, do mais urgente ao menos. */
  decidir: LinhaCarteira[]
  porClassificacao: Contagem[]
  porUnidade: Contagem[]
  totais: { ativos: number; decidir: number; vencidos: number; criticos: number; fornecedores: number; produtos: number; emNegociacao: number }
}

/** Junta as listas dos dois hospitais sem repetir o contrato de "ambos". */
export function unirContratos(...listas: ContratoHeader[][]): ContratoHeader[] {
  const vistos = new Map<string, ContratoHeader>()
  for (const l of listas) for (const c of l) if (!vistos.has(c.id)) vistos.set(c.id, c)
  return [...vistos.values()]
}

const daUnidade = (c: ContratoHeader, u: UnidadeFiltro) => u === 'todas' || c.hospitalId === u || c.hospitalId === 'ambos'

function contar(nomes: string[]): Contagem[] {
  const m = new Map<string, number>()
  for (const n of nomes) m.set(n, (m.get(n) ?? 0) + 1)
  const total = nomes.length || 1
  return [...m.entries()]
    .map(([nome, quantidade]) => ({ nome, quantidade, pct: quantidade / total }))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome))
}

export function montarCarteira(
  contratos: ContratoHeader[],
  unidade: UnidadeFiltro,
  itens?: Map<string, number>,
  comodatos?: Map<string, number>,
): Carteira {
  const daUn = contratos.filter((c) => daUnidade(c, unidade))
  const ordem = (d: number | null) => (d === null ? Number.POSITIVE_INFINITY : d)
  const linhas = daUn
    .filter((c) => c.status === 'Ativo')
    .map((c) => {
      const dias = diasParaVencer(c.vigenciaFim)
      return { contrato: c, dias, faixa: faixaPrazo(dias), itens: itens ? (itens.get(c.id) ?? 0) : null, comodatos: comodatos?.get(c.id) ?? 0 }
    })
    .sort((a, b) => ordem(a.dias) - ordem(b.dias) || a.contrato.fornecedorNome.localeCompare(b.contrato.fornecedorNome))
  const decidir = linhas.filter((l) => l.faixa === 'vencido' || l.faixa === 'critico' || l.faixa === 'atencao')
  return {
    linhas,
    decidir,
    porClassificacao: contar(linhas.map((l) => l.contrato.classificacao || 'Sem classificação')),
    porUnidade: contar(linhas.map((l) => ROTULO_UNIDADE[l.contrato.hospitalId])),
    totais: {
      ativos: linhas.length,
      decidir: decidir.length,
      vencidos: linhas.filter((l) => l.faixa === 'vencido').length,
      criticos: linhas.filter((l) => l.faixa === 'critico').length,
      fornecedores: new Set(linhas.map((l) => l.contrato.fornecedorNome.trim().toUpperCase())).size,
      produtos: linhas.reduce((s, l) => s + (l.itens ?? 0), 0),
      emNegociacao: daUn.filter((c) => c.status === 'Em Negociação').length,
    },
  }
}

/** "Vence em 12 dias", "Vence hoje", "Venceu há 3 dias", "Sem data". */
export function textoDias(dias: number | null): string {
  if (dias === null) return 'Sem data'
  if (dias === 0) return 'Vence hoje'
  if (dias < 0) return `Venceu há ${-dias} dia${dias === -1 ? '' : 's'}`
  return `${dias} dia${dias === 1 ? '' : 's'}`
}

/** Eixo da linha do tempo: de hoje (ou do vencido mais antigo) até o último vencimento, com folga. */
export function eixoTempo(linhas: LinhaCarteira[]): { min: number; max: number } {
  const dias = linhas.map((l) => l.dias).filter((d): d is number => d !== null)
  const min = Math.min(0, ...dias)
  const max = Math.max(ALERTA_VENCIMENTO_DIAS + 30, ...dias)
  return { min: min < 0 ? min - 5 : 0, max: Math.ceil((max + 15) / 30) * 30 }
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "30 nov 2026" (meses abreviados em minúsculo). */
export function dataCurta(d: Date): string {
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

/** Marcas de mês do eixo (1º dia de cada mês dentro do intervalo), em dias a partir de hoje. */
export function marcasDeMes(hoje: Date, min: number, max: number): { dias: number; rotulo: string }[] {
  const out: { dias: number; rotulo: string }[] = []
  const d = new Date(hoje.getFullYear(), hoje.getMonth() + (min < 0 ? 0 : 1), 1)
  if (min < 0) d.setMonth(d.getMonth() + Math.floor(min / 30) - 1)
  const um = 86_400_000
  while (true) {
    const dias = Math.round((d.getTime() - hoje.getTime()) / um)
    if (dias > max) break
    if (dias >= min) out.push({ dias, rotulo: d.getMonth() === 0 ? `${MESES[0]} ${d.getFullYear()}` : MESES[d.getMonth()] })
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

/** Frase-resumo da carteira, a mesma na tela e no PDF. */
export function fraseCarteira(c: Carteira, unidade: UnidadeFiltro): string {
  const t = c.totais
  const s = (n: number, sing: string, plur: string) => (n === 1 ? sing : plur)
  if (!t.ativos) return `Nenhum contrato ativo ${unidade === 'todas' ? '' : 'nesta unidade '}no momento.${t.emNegociacao ? ` Há ${t.emNegociacao} em negociação.` : ''}`
  const comItens = c.linhas.some((l) => l.itens !== null)
  return (
    `São ${t.ativos} ${s(t.ativos, 'contrato ou acordo ativo', 'contratos e acordos ativos')} com ${t.fornecedores} ${s(t.fornecedores, 'fornecedor', 'fornecedores')}` +
    `${comItens ? `, somando ${t.produtos} ${s(t.produtos, 'produto', 'produtos')} de referência de preço` : ''}. ` +
    (t.decidir
      ? `${t.decidir} ${s(t.decidir, 'precisa', 'precisam')} de decisão nos próximos 90 dias${t.vencidos ? `, ${t.vencidos} já com a vigência vencida` : ''}.`
      : `Nenhum vence nos próximos 90 dias.`) +
    (t.emNegociacao ? ` Há ainda ${t.emNegociacao} em negociação.` : '')
  )
}
