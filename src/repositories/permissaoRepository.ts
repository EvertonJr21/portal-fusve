import { supabase } from '@/lib/supabase'
import type { ModuloChave } from '@/constants'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type PermissaoRow = Database['public']['Tables']['permissoes_modulo']['Row']

export interface Perfil {
  id: string
  email: string
  nome: string
  role: 'admin' | 'user'
  criadoEm: string | null
}

export interface PermissaoModulo {
  modulo: ModuloChave
  podeVer: boolean
  podeEditar: boolean
}

function toPerfil(row: ProfileRow): Perfil {
  return {
    id: row.id,
    email: row.email,
    nome: row.nome ?? '',
    role: row.role === 'admin' ? 'admin' : 'user',
    criadoEm: row.created_at,
  }
}

function toPermissao(row: PermissaoRow): PermissaoModulo {
  return {
    modulo: row.modulo as ModuloChave,
    podeVer: row.pode_ver,
    podeEditar: row.pode_editar,
  }
}

/** O próprio perfil (RLS permite ler a própria linha, admin ou não). */
export async function buscarMeuPerfil(userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data ? toPerfil(data) : null
}

/** Minhas permissões por módulo — vazio pra módulo sem linha (sem acesso). */
export async function buscarMinhasPermissoes(userId: string): Promise<PermissaoModulo[]> {
  const { data, error } = await supabase.from('permissoes_modulo').select('*').eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map(toPermissao)
}

/** Admin: lista todos os perfis (RLS só deixa admin ver todo mundo). */
export async function listarPerfis(): Promise<Perfil[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('email', { ascending: true })
  if (error) throw error
  return (data ?? []).map(toPerfil)
}

export interface PermissaoDeUsuario extends PermissaoModulo {
  userId: string
}

/** Admin: todas as permissões de todos os usuários numa query só. */
export async function listarTodasPermissoes(): Promise<PermissaoDeUsuario[]> {
  const { data, error } = await supabase.from('permissoes_modulo').select('*')
  if (error) throw error
  return (data ?? []).map((row) => ({ ...toPermissao(row), userId: row.user_id }))
}

/** Admin: concede/revoga ver e editar de um módulo pra um usuário. */
export async function salvarPermissao(userId: string, modulo: ModuloChave, podeVer: boolean, podeEditar: boolean): Promise<void> {
  const { error } = await supabase
    .from('permissoes_modulo')
    .upsert({ user_id: userId, modulo, pode_ver: podeVer, pode_editar: podeEditar }, { onConflict: 'user_id,modulo' })
  if (error) throw error
}

/** Admin: promove/rebaixa o papel de um usuário. */
export async function salvarRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw error
}

/**
 * Admin: exclui a conta de vez (Edge Function `delete-user` — apagar
 * `auth.users` só dá pra fazer com `service_role`, não é RLS comum).
 * `profiles`/`permissoes_modulo` somem sozinhos (`ON DELETE CASCADE`); se a
 * conta ainda for dona de OCs/Pareceres/Contratos/OPMEs, a function recusa
 * com uma mensagem explicando o motivo em vez de apagar/orfanizar dado real.
 */
export async function excluirUsuario(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId } })
  if (error || data?.error) throw new Error(data?.error ?? 'Não foi possível excluir o usuário.')
}
