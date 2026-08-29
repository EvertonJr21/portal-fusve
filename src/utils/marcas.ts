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

export type StatusBionexo = 'ok' | 'tem_restrita' | 'tem_proibida' | 'sem_parecer'

/** Status de um item de cotação Bionexo frente ao parecer do produto — replica `processarBio` do legado. */
export function statusBionexoDoParecer(parecer: Parecer | null | undefined): StatusBionexo {
  if (!parecer) return 'sem_parecer'
  if (parecer.proibidas.length) return 'tem_proibida'
  if (parecer.restritas.length) return 'tem_restrita'
  return 'ok'
}
