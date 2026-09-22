import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

/** Acesso ao Supabase pra `marcas_sugeridas` — mesmo padrão de `ocRepository.ts` (Hardening P2). */

type MarcaSugeridaRow = Database['public']['Tables']['marcas_sugeridas']['Row']

export function toMapa(rows: MarcaSugeridaRow[]): Record<string, string[]> {
  const mapa: Record<string, string[]> = {}
  for (const row of rows) mapa[row.cat] = row.marcas ?? []
  return mapa
}

export async function listarMarcasSugeridas(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase.from('marcas_sugeridas').select('*').order('cat')
  if (error) throw error
  return toMapa(data as MarcaSugeridaRow[])
}

/**
 * Isolado por usuário desde 22/09/2026 (item 43 do backlog, pedido do Everton —
 * "cada um deveria ter a recomendação de marcas sugeridas, de acordo com cada
 * setor") — chave de conflito passou de `cat` sozinho pra `(owner_id, cat)`,
 * já que dois usuários podem ter a mesma categoria com marcas diferentes.
 * `owner_id` não entra no payload de propósito (mesmo padrão das outras
 * tabelas) — a coluna tem `DEFAULT auth.uid()`, preenchida só no INSERT.
 */
export async function salvarMarcasSugeridas(cat: string, marcas: string[]): Promise<void> {
  const { error } = await supabase
    .from('marcas_sugeridas')
    .upsert({ cat: cat.trim().toUpperCase(), marcas }, { onConflict: 'owner_id,cat' })
  if (error) throw error
}

export async function excluirMarcasSugeridas(cat: string): Promise<void> {
  const { error } = await supabase.from('marcas_sugeridas').delete().eq('cat', cat)
  if (error) throw error
}
