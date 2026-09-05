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
