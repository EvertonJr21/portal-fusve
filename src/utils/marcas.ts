import type { MarcaCategoria, Parecer } from '@/types'

export const CATEGORIAS_MARCA: { key: MarcaCategoria; label: string; descricao: string }[] = [
  { key: 'padrao', label: 'Padrão', descricao: 'comprar sempre' },
  { key: 'permitidas', label: 'Permitidas', descricao: 'se padrão indisponível' },
  { key: 'restritas', label: 'Restritas', descricao: 'consultar antes' },
  { key: 'proibidas', label: 'Proibidas', descricao: 'não comprar' },
]

export function temAlgumaMarca(p: Pick<Parecer, MarcaCategoria>): boolean {
  return CATEGORIAS_MARCA.some((c) => p[c.key].length > 0)
}

/**
 * Parecer tem conteúdo de verdade: ao menos uma marca OU um requisito técnico de
 * compra (ex: "só se for de silicone") — produto pode ter parecer sem marca nenhuma.
 */
export function temConteudoParecer(p: Pick<Parecer, MarcaCategoria | 'requisitoTecnico'>): boolean {
  return temAlgumaMarca(p) || p.requisitoTecnico.trim().length > 0
}
