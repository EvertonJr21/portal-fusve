import type { HospitalId } from '@/constants'
import { supabase } from '@/lib/supabase'
import type { Area, Grupo, ItemArea, ItemCatalogo } from '@/types'
import type { Database } from '@/types/database'

/**
 * Acesso ao Supabase pro módulo Catálogo de Materiais por Área Hospitalar —
 * mesmo padrão repository/hook-adaptador do resto do projeto (regra 4 do
 * CLAUDE.md). Ver CLAUDE.md, seção do módulo, pro modelo de dados completo:
 * `areas` por hospital, `grupos`/`itens` compartilhados, `item_grupos`/
 * `item_areas` como junções N:N (sem hierarquia fixa entre grupo e área).
 */

type AreaRow = Database['public']['Tables']['areas']['Row']
type GrupoRow = Database['public']['Tables']['grupos']['Row']
type ItemRow = Database['public']['Tables']['itens']['Row']
type ItemAreaRow = Database['public']['Tables']['item_areas']['Row']

const TAMANHO_PAGINA = 1000

/**
 * Pagina com `.range()` até a página vir mais curta que `TAMANHO_PAGINA` — o
 * PostgREST do Supabase limita a 1000 linhas por padrão, mesmo sem `.limit()`
 * explícito (mesmo bug real já corrigido em `fornecedorRepository.ts`, item 41
 * do backlog — `itens` deste módulo também passa de 1000 linhas facilmente).
 * A query passada precisa de ordenação com desempate único.
 */
async function buscarTudo<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
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

export function toArea(row: AreaRow): Area {
  return {
    id: row.id,
    hospitalId: row.hospital_id as HospitalId,
    nome: row.nome,
    ordem: row.ordem,
    ativo: row.ativo,
  }
}

export function toGrupo(row: GrupoRow): Grupo {
  return { id: row.id, nome: row.nome, ordem: row.ordem }
}

export function toItem(row: ItemRow): ItemCatalogo {
  return {
    id: row.id,
    nome: row.nome,
    unidadePadrao: row.unidade_padrao,
    codSoulmv: row.cod_soulmv,
    sinonimos: row.sinonimos ?? [],
    observacao: row.observacao,
  }
}

export function toItemArea(row: ItemAreaRow): ItemArea {
  return { itemId: row.item_id, areaId: row.area_id, principal: row.principal }
}

// ---- Áreas ----

export async function listarAreas(hospitalId: HospitalId): Promise<Area[]> {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .eq('hospital_id', hospitalId)
    .is('deleted_at', null)
    .order('ordem')
    .order('nome')
  if (error) throw error
  return (data as AreaRow[]).map(toArea)
}

export async function salvarArea(area: Area): Promise<void> {
  const { error } = await supabase.from('areas').upsert({
    id: area.id,
    hospital_id: area.hospitalId,
    nome: area.nome,
    ordem: area.ordem,
    ativo: area.ativo,
  })
  if (error) throw error
}

export async function excluirArea(id: string): Promise<void> {
  const { error } = await supabase.from('areas').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ---- Grupos ----

export async function listarGrupos(): Promise<Grupo[]> {
  const { data, error } = await supabase.from('grupos').select('*').is('deleted_at', null).order('nome')
  if (error) throw error
  return (data as GrupoRow[]).map(toGrupo)
}

export async function salvarGrupo(grupo: Grupo): Promise<void> {
  const { error } = await supabase.from('grupos').upsert({ id: grupo.id, nome: grupo.nome, ordem: grupo.ordem })
  if (error) throw error
}

export async function excluirGrupo(id: string): Promise<void> {
  const { error } = await supabase.from('grupos').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ---- Itens ----

/** Lista completa — usada na tela de Gestão (paginação/busca ficam no cliente, mesmo padrão de Fornecedores.tsx). */
export async function listarItens(): Promise<ItemCatalogo[]> {
  const rows = await buscarTudo<ItemRow>((from, to) =>
    supabase.from('itens').select('*').is('deleted_at', null).order('nome').order('id').range(from, to),
  )
  return rows.map(toItem)
}

/**
 * Busca server-side por nome ou sinônimo — usada no autocomplete de busca
 * (não faz sentido puxar os ~5.400 itens pra filtrar no cliente toda vez).
 * `sinonimos` é `text[]`; compara como texto porque não há necessidade de
 * full-text search pra um catálogo desse tamanho.
 */
export async function buscarItensPorTexto(texto: string, limite = 30): Promise<ItemCatalogo[]> {
  const termo = texto.trim()
  if (!termo) return []
  const { data, error } = await supabase
    .from('itens')
    .select('*')
    .is('deleted_at', null)
    .or(`nome.ilike.%${termo}%,sinonimos.cs.{${termo}}`)
    .order('nome')
    .limit(limite)
  if (error) throw error
  return (data as ItemRow[]).map(toItem)
}

export async function salvarItem(item: ItemCatalogo): Promise<void> {
  const { error } = await supabase.from('itens').upsert({
    id: item.id,
    nome: item.nome,
    unidade_padrao: item.unidadePadrao,
    cod_soulmv: item.codSoulmv,
    sinonimos: item.sinonimos,
    observacao: item.observacao,
  })
  if (error) throw error
}

export async function excluirItem(id: string): Promise<void> {
  const { error } = await supabase.from('itens').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ---- Item ↔ Grupo (N:N) ----

export async function listarGruposDoItem(itemId: string): Promise<string[]> {
  const { data, error } = await supabase.from('item_grupos').select('grupo_id').eq('item_id', itemId)
  if (error) throw error
  return (data ?? []).map((r) => r.grupo_id)
}

export async function listarItensDoGrupo(grupoId: string): Promise<string[]> {
  const rows = await buscarTudo<{ item_id: string }>((from, to) =>
    supabase.from('item_grupos').select('item_id').eq('grupo_id', grupoId).range(from, to),
  )
  return rows.map((r) => r.item_id)
}

/** Substitui os grupos do item pelos informados (diff simples — delete tudo, insere os atuais). */
export async function definirGruposDoItem(itemId: string, grupoIds: string[]): Promise<void> {
  const { error: delError } = await supabase.from('item_grupos').delete().eq('item_id', itemId)
  if (delError) throw delError
  if (grupoIds.length === 0) return
  const { error } = await supabase.from('item_grupos').insert(grupoIds.map((grupoId) => ({ item_id: itemId, grupo_id: grupoId })))
  if (error) throw error
}

// ---- Item ↔ Área (N:N) ----

export async function listarAreasDoItem(itemId: string): Promise<ItemArea[]> {
  const { data, error } = await supabase.from('item_areas').select('*').eq('item_id', itemId)
  if (error) throw error
  return (data as ItemAreaRow[]).map(toItemArea)
}

/**
 * Itens vinculados a uma área — usado na navegação master-detail (`/catalogo`).
 *
 * **Bug real corrigido (01/10/2026)**: a versão anterior buscava `item_areas`
 * (paginado) e depois fazia `itens.select().in('id', [...milhares de ids])` —
 * pra uma área que recebeu muitos grupos no mapeamento automático (item 53 do
 * backlog, ex: Centro Cirúrgico Geral), esse `IN` chegava a ter milhares de
 * UUIDs, deixando a tela extremamente lenta (payload gigante de ida e volta,
 * sem contar múltiplas páginas de 1000 em 1000 só pra montar a lista de ids).
 * Trocado por um único `JOIN` via embed do PostgREST (`itens!inner(*)`) —
 * o filtro e a ordenação rodam dentro do Postgres, usando o índice
 * `idx_item_areas_area` já existente, numa única viagem de rede.
 */
export async function listarItensDaArea(areaId: string): Promise<ItemCatalogo[]> {
  const rows = await buscarTudo<{ itens: ItemRow }>((from, to) =>
    supabase
      .from('item_areas')
      .select('itens!inner(*)')
      .eq('area_id', areaId)
      .is('itens.deleted_at', null)
      .order('nome', { referencedTable: 'itens' })
      .order('item_id')
      .range(from, to),
  )
  return rows.map((r) => toItem(r.itens))
}

export async function definirAreaItem(itemId: string, areaId: string, principal: boolean): Promise<void> {
  const { error } = await supabase
    .from('item_areas')
    .upsert({ item_id: itemId, area_id: areaId, principal }, { onConflict: 'item_id,area_id' })
  if (error) throw error
}

export async function removerAreaItem(itemId: string, areaId: string): Promise<void> {
  const { error } = await supabase.from('item_areas').delete().eq('item_id', itemId).eq('area_id', areaId)
  if (error) throw error
}
