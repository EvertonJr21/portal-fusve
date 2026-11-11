import type { ContratoHeader, Opme } from '@/types'
import { diasParaVencer } from './contrato'
import { diasEntre, fmt, fromInput, parseDMY } from './date'
import type { LinhaOC } from './ocLista'

/**
 * Resumo do dia — o que a tela inicial e o sino do topo mostram. Funções puras
 * sobre dados que as telas já carregam (linhas de OC, contratos, OPMEs); nenhuma
 * regra nova, só contagem e seleção do que vence/chega agora.
 */

/** Dias à frente em que um OPME pendente entra no resumo. */
export const DIAS_OPME_PROXIMOS = 7

export interface EntregaPrevista {
  ocId: number
  fornecedor: string
  /** 0 = hoje, 1 = amanhã. */
  dias: number
}

export interface ResumoOCs {
  abertas: number
  precisaAcao: number
  vencidas: number
  semPrevisao: number
  previsaoDescumprida: number
  aConfirmar: number
  entregas: EntregaPrevista[]
}

export function resumoOCs(linhas: LinhaOC[], hoje: Date): ResumoOCs {
  const r: ResumoOCs = { abertas: 0, precisaAcao: 0, vencidas: 0, semPrevisao: 0, previsaoDescumprida: 0, aConfirmar: 0, entregas: [] }
  for (const l of linhas) {
    if (!l.aberta) {
      if ((l.oc.sit === 'Atendida' || l.oc.sit === 'Fechada') && !l.avaliacao.confirmada) r.aConfirmar++
      continue
    }
    r.abertas++
    if (l.prioridade === 'critica' || l.prioridade === 'alta') r.precisaAcao++
    if (l.statusPrazo === 'vencida') r.vencidas++
    if (!l.oc.previsaoForn) r.semPrevisao++
    if (l.previsaoDescumprida) r.previsaoDescumprida++
    const prev = parseDMY(l.oc.previsaoForn)
    if (prev) {
      const dias = diasEntre(hoje, prev)
      if (dias === 0 || dias === 1) r.entregas.push({ ocId: l.oc.id, fornecedor: l.oc.fornecedorNome, dias })
    }
  }
  r.entregas.sort((a, b) => a.dias - b.dias || a.ocId - b.ocId)
  return r
}

export interface ContratoVencendo {
  id: string
  nome: string
  dias: number
}

export interface ResumoContratos {
  ativos: number
  vencidos: number
  em30: number
  em90: number
  /** Ativos vencidos ou vencendo em até 90 dias, do mais urgente pro menos. */
  lista: ContratoVencendo[]
}

export function resumoContratos(contratos: ContratoHeader[]): ResumoContratos {
  const r: ResumoContratos = { ativos: 0, vencidos: 0, em30: 0, em90: 0, lista: [] }
  for (const c of contratos) {
    if (c.status !== 'Ativo') continue
    r.ativos++
    const dias = diasParaVencer(c.vigenciaFim)
    if (dias === null || dias > 90) continue
    if (dias < 0) r.vencidos++
    else if (dias <= 30) r.em30++
    else r.em90++
    r.lista.push({ id: c.id, nome: c.titulo ? `${c.titulo} — ${c.fornecedorNome}` : c.fornecedorNome, dias })
  }
  r.lista.sort((a, b) => a.dias - b.dias)
  return r
}

export interface OpmePendente {
  id: string
  paciente: string
  data: string
  /** Dias até a cirurgia (negativo = já passou e continua pendente). */
  dias: number
  fornecedorId: number | null
}

export interface ResumoOpmes {
  proximos: OpmePendente[]
  atrasados: OpmePendente[]
}

export function resumoOpmes(opmes: Opme[], hoje: Date): ResumoOpmes {
  const r: ResumoOpmes = { proximos: [], atrasados: [] }
  for (const o of opmes) {
    if (o.status !== 'pendente') continue
    const d = parseDMY(o.dataCirurgia.includes('/') ? o.dataCirurgia : fromInput(o.dataCirurgia))
    if (!d) continue
    const dias = diasEntre(hoje, d)
    const item: OpmePendente = { id: o.id, paciente: o.paciente, data: fmt(d), dias, fornecedorId: o.fornecedorId }
    if (dias < 0) r.atrasados.push(item)
    else if (dias <= DIAS_OPME_PROXIMOS) r.proximos.push(item)
  }
  r.proximos.sort((a, b) => a.dias - b.dias)
  r.atrasados.sort((a, b) => b.dias - a.dias)
  return r
}

export type TomAlerta = 'red' | 'amber' | 'blue'

export interface Alerta {
  /** Estável enquanto a situação não muda — usado pra marcar como visto. */
  id: string
  tom: TomAlerta
  titulo: string
  detalhe: string
  to: string
}

const quando = (dias: number) => (dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`)

/** Lista do sino: o que pede atenção agora, do mais urgente pro menos. */
export function montarAlertas(ocs: ResumoOCs | null, contratos: ResumoContratos | null, opmes: ResumoOpmes | null): Alerta[] {
  const a: Alerta[] = []
  if (ocs) {
    for (const e of ocs.entregas) {
      a.push({
        id: `oc-entrega-${e.ocId}-${e.dias}`,
        tom: e.dias === 0 ? 'amber' : 'blue',
        titulo: `OC ${e.ocId} — entrega ${quando(e.dias)}`,
        detalhe: e.dias === 0 ? `${e.fornecedor} · conferir recebimento` : `${e.fornecedor} · confirmar com o fornecedor`,
        to: `/ocs/ordens?visao=acao&q=${e.ocId}`,
      })
    }
    if (ocs.vencidas) {
      a.push({
        id: `oc-vencidas-${ocs.vencidas}`,
        tom: 'red',
        titulo: `${ocs.vencidas} OC(s) além da data prometida`,
        detalhe: 'Cobrar os fornecedores',
        to: '/ocs/ordens?visao=vencidas',
      })
    }
    if (ocs.previsaoDescumprida) {
      a.push({
        id: `oc-descumprida-${ocs.previsaoDescumprida}`,
        tom: 'red',
        titulo: `${ocs.previsaoDescumprida} OC(s) com previsão descumprida`,
        detalhe: 'A data combinada passou sem entrega',
        to: '/ocs/ordens?visao=acao',
      })
    }
  }
  if (opmes) {
    for (const o of opmes.proximos.filter((x) => x.dias <= 1)) {
      a.push({
        id: `opme-${o.id}-${o.dias}`,
        tom: 'red',
        titulo: `OPME pendente — cirurgia ${quando(o.dias)}`,
        detalhe: o.paciente,
        to: '/opmes/gestao',
      })
    }
    const depois = opmes.proximos.filter((x) => x.dias > 1).length
    if (depois) {
      a.push({
        id: `opme-proximos-${depois}`,
        tom: 'amber',
        titulo: `${depois} OPME(s) pendente(s) nos próximos ${DIAS_OPME_PROXIMOS} dias`,
        detalhe: 'Conferir a entrega antes da cirurgia',
        to: '/opmes/gestao',
      })
    }
    if (opmes.atrasados.length) {
      a.push({
        id: `opme-atrasados-${opmes.atrasados.length}`,
        tom: 'amber',
        titulo: `${opmes.atrasados.length} OPME(s) com cirurgia passada ainda pendente(s)`,
        detalhe: 'Marcar como finalizado, se já foi entregue',
        to: '/opmes/gestao',
      })
    }
  }
  if (contratos) {
    for (const c of contratos.lista.filter((x) => x.dias <= 30)) {
      a.push({
        id: `contrato-${c.id}-${c.dias < 0 ? 'vencido' : 'em30'}`,
        tom: c.dias < 0 ? 'red' : 'amber',
        titulo: c.dias < 0 ? `Contrato vencido há ${Math.abs(c.dias)} dia(s)` : `Contrato vence ${quando(c.dias)}`,
        detalhe: c.nome,
        to: `/contratos?vigencia=${c.dias < 0 ? 'vencido' : 'vencendo'}`,
      })
    }
  }
  const ordem: Record<TomAlerta, number> = { red: 0, amber: 1, blue: 2 }
  return a.sort((x, y) => ordem[x.tom] - ordem[y.tom])
}
