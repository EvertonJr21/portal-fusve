import { supabase } from '@/lib/supabase'
import type { Fornecedor } from '@/types'
import type { Database } from '@/types/database'

/** Acesso ao Supabase pra `forns` — mesmo padrão de `ocRepository.ts` (Hardening P2). */

type FornRow = Database['public']['Tables']['forns']['Row']

export function toFornecedor(row: FornRow): Fornecedor {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email ?? '',
    wpp: row.wpp ?? '',
  }
}

/** Fornecedores são compartilhados entre hospitais — sem filtro de hospital_id. */
export async function listarFornecedores(): Promise<Fornecedor[]> {
  const { data, error } = await supabase
    .from('forns')
    .select('*')
    .is('deleted_at', null)
    .order('nome', { ascending: true })
  if (error) throw error
  return (data as FornRow[]).map(toFornecedor)
}

export async function salvarFornecedor(forn: Fornecedor): Promise<void> {
  const { error } = await supabase.from('forns').upsert({
    id: forn.id,
    nome: forn.nome.trim().toUpperCase(),
    email: forn.email || '',
    wpp: forn.wpp.replace(/\D/g, ''),
  })
  if (error) throw error
}

export async function excluirFornecedor(id: number): Promise<void> {
  const { error } = await supabase
    .from('forns')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
