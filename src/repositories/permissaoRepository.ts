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
  suspensa: boolean
}

/** As 5 tabelas de dado com `owner_id` isolado por usuário (item 43/47 do backlog). */
const TABELAS_COM_DONO = ['ocs', 'sols', 'pareceres', 'contratos', 'opmes'] as const

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
    suspensa: row.suspensa,
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

/**
 * Admin: move todo o dado (OCs/Sols/Pareceres/Contratos/OPMEs) que era de
 * `deUserId` pra `paraUserId` — direto no cliente, sem Edge Function,
 * porque `is_admin()` já dá bypass total nas policies de `UPDATE` das 5
 * tabelas (ver migration `202609220004`). Útil antes de excluir/suspender
 * uma conta que ainda é dona de registro (`delete-user` recusa nesse caso
 * de propósito) ou pra trocar alguém de setor sem perder o histórico.
 */
export async function reatribuirDados(deUserId: string, paraUserId: string): Promise<void> {
  for (const tabela of TABELAS_COM_DONO) {
    const { error } = await supabase.from(tabela).update({ owner_id: paraUserId }).eq('owner_id', deUserId)
    if (error) throw error
  }
}

/**
 * Admin: suspende/reativa uma conta (Edge Function `toggle-suspensao` —
 * bloquear login via `ban_duration` só dá pra fazer com `service_role`).
 * Alternativa mais segura que `excluirUsuario` pra afastamento temporário —
 * não apaga nada, só impede login.
 */
export async function alternarSuspensao(userId: string, suspender: boolean): Promise<void> {
  const { data, error } = await supabase.functions.invoke('toggle-suspensao', { body: { userId, suspender } })
  if (error || data?.error) throw new Error(data?.error ?? 'Não foi possível alterar a suspensão.')
}

/**
 * Admin: redefine a senha de outra conta direto, sem depender do fluxo de
 * e-mail (Edge Function `reset-password` — já esbarramos em rate limit de
 * e-mail nesse projeto antes, ver item 13 do backlog).
 */
export async function resetarSenha(userId: string, novaSenha: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('reset-password', {
    body: { userId, newPassword: novaSenha },
  })
  if (error || data?.error) throw new Error(data?.error ?? 'Não foi possível redefinir a senha.')
}
