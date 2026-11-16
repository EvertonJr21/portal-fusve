import type { MarcaCategoria, Parecer } from '@/types'
import { getHoje, parseDMY } from '@/utils/date'

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

export type NivelValidade = 'ok' | 'atencao' | 'revisar'

/**
 * Idade do parecer em meses e se precisa de revisão: até 11 meses ok, 12–17
 * atenção, 18+ revisar. `dataParecer` vem em DD/MM/AAAA (antes era lida com
 * `new Date()`, que não entende esse formato — a coluna Validade ficava vazia).
 */
export function validadeParecer(dataParecer: string, hoje: Date = getHoje()): { meses: number; nivel: NivelValidade } | null {
  const d = parseDMY(dataParecer)
  if (!d || Number.isNaN(d.getTime())) return null
  const meses = Math.max(0, (hoje.getFullYear() - d.getFullYear()) * 12 + (hoje.getMonth() - d.getMonth()) - (hoje.getDate() < d.getDate() ? 1 : 0))
  return { meses, nivel: meses < 12 ? 'ok' : meses < 18 ? 'atencao' : 'revisar' }
}

export function rotuloValidade(v: { meses: number; nivel: NivelValidade }): string {
  const idade = v.meses === 0 ? 'menos de 1 mês' : v.meses === 1 ? '1 mês' : `${v.meses} meses`
  return v.nivel === 'revisar' ? `${idade} — revisar` : idade
}
