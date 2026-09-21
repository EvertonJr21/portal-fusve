import { supabase } from '@/lib/supabase'
import type { Fornecedor } from '@/types'
import type { Database } from '@/types/database'
import type { FornecedorImportado } from '@/utils/fornecedoresCsv'

/** Acesso ao Supabase pra `forns` — mesmo padrão de `ocRepository.ts` (Hardening P2). */

type FornRow = Database['public']['Tables']['forns']['Row']

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
  const { data, error } = await supabase
    .from('forns')
    .select('*')
    .is('deleted_at', null)
    .order('nome', { ascending: true })
  if (error) throw error
  return (data as FornRow[]).map(toFornecedor)
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

/** `id -> cnpj` de todo fornecedor já cadastrado — usado pela importação em massa pra decidir insert (novo) vs. atualizar só o CNPJ (já existe). */
export async function mapaCnpjExistentes(): Promise<Map<number, string | null>> {
  const { data, error } = await supabase.from('forns').select('id, cnpj')
  if (error) throw error
  return new Map((data as Pick<FornRow, 'id' | 'cnpj'>[]).map((r) => [r.id, r.cnpj]))
}

const TAMANHO_LOTE = 500

async function emLotes<T>(itens: T[], fn: (lote: T[]) => Promise<void>): Promise<void> {
  for (let i = 0; i < itens.length; i += TAMANHO_LOTE) {
    await fn(itens.slice(i, i + TAMANHO_LOTE))
  }
}

/** Cria fornecedores que ainda não existem em `forns` (id/nome/cnpj) — em lotes, não um upsert por linha (4k+ fornecedores no CSV do SoulMV). */
export async function inserirFornecedoresNovos(fs: FornecedorImportado[]): Promise<void> {
  await emLotes(fs, async (lote) => {
    const { error } = await supabase.from('forns').upsert(lote.map((f) => ({ id: f.id, nome: f.nome, cnpj: f.cnpj })))
    if (error) throw error
  })
}

/**
 * Preenche o CNPJ de fornecedores que já existiam, sem tocar nome/e-mail/
 * WhatsApp já cadastrados. Payload deliberadamente parcial (só `id`/`cnpj`,
 * sem `nome`) — o `ON CONFLICT DO UPDATE` do Postgres só toca as colunas do
 * `SET`, então isso é seguro pra linha que já existe (é sempre o caso aqui,
 * `fs` só contém ids já confirmados em `forns` por `mapaCnpjExistentes`).
 * O tipo `Insert` gerado marca `nome` como obrigatório porque também cobre
 * o caminho de insert de linha nova, que não é o usado aqui — daí o cast.
 */
export async function atualizarCnpjEmLote(fs: { id: number; cnpj: string | null }[]): Promise<void> {
  type FornInsert = Database['public']['Tables']['forns']['Insert']
  await emLotes(fs, async (lote) => {
    const { error } = await supabase.from('forns').upsert(lote.map((f) => ({ id: f.id, cnpj: f.cnpj })) as FornInsert[])
    if (error) throw error
  })
}

export async function excluirFornecedor(id: number): Promise<void> {
  const { error } = await supabase
    .from('forns')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
