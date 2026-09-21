import { supabase } from '@/lib/supabase'
import type { Fornecedor } from '@/types'
import type { Database } from '@/types/database'

/** Acesso ao Supabase pra `forns` — mesmo padrão de `ocRepository.ts` (Hardening P2). */

type FornRow = Database['public']['Tables']['forns']['Row']

const TAMANHO_PAGINA = 1000

/**
 * Busca todas as linhas de uma query, paginando com `.range()` — o PostgREST
 * do Supabase limita a **1000 linhas por padrão** mesmo sem `.limit()`
 * explícito. Bug real (21/09/2026, achado depois da importação do
 * R_FORNEC.csv fazer `forns` passar de algumas dezenas pra ~4.446 linhas):
 * `listarFornecedores()`/`mapaFornecedoresExistentes()` sem paginação
 * devolviam só as primeiras ~1000 — a lista de fornecedores da tela e a
 * comparação "já existe?" da importação ficavam incompletas em silêncio
 * (sem erro nenhum, só menos linhas do que deveria). A query passada
 * **precisa** ter uma ordenação com desempate único (`id`, que é PK) —
 * `.range()` sem ordem estável pode pular ou repetir linha entre páginas.
 */
async function buscarTudo<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const todas: T[] = []
  let inicio = 0
  for (;;) {
    const { data, error } = await query(inicio, inicio + TAMANHO_PAGINA - 1)
    if (error) throw error
    const pagina = data ?? []
    todas.push(...pagina)
    if (pagina.length < TAMANHO_PAGINA) break
    inicio += TAMANHO_PAGINA
  }
  return todas
}

export function toFornecedor(row: FornRow): Fornecedor {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email ?? '',
    wpp: row.wpp ?? '',
    cnpj: row.cnpj,
  }
}

/** Fornecedores são compartilhados entre hospitais — sem filtro de hospital_id. */
export async function listarFornecedores(): Promise<Fornecedor[]> {
  const rows = await buscarTudo<FornRow>((from, to) =>
    supabase
      .from('forns')
      .select('*')
      .is('deleted_at', null)
      .order('nome', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  )
  return rows.map(toFornecedor)
}

export async function salvarFornecedor(forn: Fornecedor): Promise<void> {
  // `cnpj` só entra no payload se vier explicitamente definido — o formulário
  // manual (FornecedorForm) não tem esse campo, e um upsert incondicional com
  // `cnpj: undefined || null` apagaria o CNPJ trazido pela importação do
  // R_FORNEC.csv toda vez que alguém editasse e-mail/WhatsApp pela tela.
  const payload: Database['public']['Tables']['forns']['Insert'] = {
    id: forn.id,
    nome: forn.nome.trim().toUpperCase(),
    email: forn.email || '',
    wpp: forn.wpp.replace(/\D/g, ''),
  }
  if (forn.cnpj !== undefined) payload.cnpj = forn.cnpj
  const { error } = await supabase.from('forns').upsert(payload)
  if (error) throw error
}

export async function excluirFornecedor(id: number): Promise<void> {
  const { error } = await supabase
    .from('forns')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
