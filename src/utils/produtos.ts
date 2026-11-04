import type { Produto } from '@/data/produtos'

/** Remove acentos e padroniza em maiúsculas — o catálogo do SoulMV vem sem acento. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
}

/**
 * Busca no catálogo SoulMV, usada pelo autocomplete de Pareceres e de Contratos.
 *
 * - Termo só com dígitos → busca por código (prefixo); o código exato vem primeiro.
 * - Termo com texto → todas as palavras precisam aparecer no nome, em qualquer ordem
 *   ("LUVA PROC M" acha "LUVA PARA PROCEDIMENTO TAM M"). Nomes que começam com a
 *   primeira palavra digitada vêm antes dos que só a contêm no meio.
 */
export function buscarProdutos(produtos: Produto[], termo: string, limite = 14): Produto[] {
  const q = normalizar(termo)
  if (!q) return []

  if (/^\d+$/.test(q)) {
    const exato = produtos.find((p) => p.cod === q)
    const prefixo = produtos.filter((p) => p.cod !== q && p.cod.startsWith(q))
    return (exato ? [exato, ...prefixo] : prefixo).slice(0, limite)
  }

  const palavras = q.split(/\s+/)
  const inicio: Produto[] = []
  const meio: Produto[] = []
  for (const p of produtos) {
    const nome = normalizar(p.nome)
    if (!palavras.every((w) => nome.includes(w) || p.cod === w)) continue
    if (nome.startsWith(palavras[0])) inicio.push(p)
    else meio.push(p)
    if (inicio.length >= limite) break
  }
  return [...inicio, ...meio].slice(0, limite)
}
