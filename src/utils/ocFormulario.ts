import type { Fornecedor, OC, Solicitacao } from '@/types'
import { parseDMY } from './date'
import { normalizarTexto } from './produtos'

/**
 * Regras do formulário de OC (item 110) — reaproveitar o que já está no
 * portal em vez de digitar de novo: fornecedores e estoques já usados,
 * solicitação de origem e o último pedido do mesmo fornecedor.
 */

/** Quantas OCs cada fornecedor (código SoulMV) já tem — sobe na busca do formulário. */
export function usoFornecedoresEmOCs(ocs: OC[]): Map<number, number> {
  const uso = new Map<number, number>()
  for (const o of ocs) if (o.fornecedorId !== null) uso.set(o.fornecedorId, (uso.get(o.fornecedorId) ?? 0) + 1)
  return uso
}

/** Estoques já usados, do mais frequente pro menos (sugestões do campo Estoque). */
export function estoquesMaisUsados(ocs: OC[], limite = 30): string[] {
  const cont = new Map<string, number>()
  for (const o of ocs) {
    const e = (o.estoque ?? '').trim().toUpperCase()
    if (e) cont.set(e, (cont.get(e) ?? 0) + 1)
  }
  return [...cont.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limite)
    .map(([e]) => e)
}

/** OC mais recente do fornecedor (por código; sem código, pelo nome). */
export function ultimaOCDoFornecedor(ocs: OC[], fornecedorId: number | null, nome: string, ignorarId?: number): OC | null {
  const chave = normalizarTexto(nome)
  const doForn = ocs.filter(
    (o) => o.id !== ignorarId && (fornecedorId !== null ? o.fornecedorId === fornecedorId : !!chave && normalizarTexto(o.fornecedorNome) === chave),
  )
  if (!doForn.length) return null
  const t = (o: OC) => parseDMY(o.dataSolic)?.getTime() ?? 0
  return doForn.sort((a, b) => t(b) - t(a) || b.id - a.id)[0]
}

/** Fornecedor do cadastro com exatamente esse nome (sem acento/maiúsculas). */
export function acharFornecedorPorNome(cadastro: Fornecedor[], nome: string): Fornecedor | null {
  const chave = normalizarTexto(nome)
  return chave ? (cadastro.find((f) => normalizarTexto(f.nome) === chave) ?? null) : null
}

/** Solicitações pelo número (começando pelo que foi digitado) ou por palavras do produto/solicitante. */
export function buscarSolicitacoes(sols: Solicitacao[], termo: string, limite = 8): Solicitacao[] {
  const t = termo.trim()
  if (!t) return []
  if (/^\d+$/.test(t)) return sols.filter((s) => String(s.id).startsWith(t)).sort((a, b) => b.id - a.id).slice(0, limite)
  const palavras = normalizarTexto(t).split(' ').filter(Boolean)
  return sols
    .filter((s) => {
      const alvo = normalizarTexto(`${s.produto} ${s.solicitante}`)
      return palavras.every((p) => alvo.includes(p))
    })
    .sort((a, b) => b.id - a.id)
    .slice(0, limite)
}
