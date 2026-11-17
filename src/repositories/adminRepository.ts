import { supabase } from '@/lib/supabase'

/**
 * Dados da Administração (item 113): último acesso das contas, registro de
 * ações de admin (`admin_auditoria`) e atividade recente nos módulos
 * (`historico_alteracoes`). Tudo depende da migration 202611170001 — sem
 * ela, as funções de leitura lançam e a tela mostra o aviso de migration.
 */

export interface ContaAuth {
  id: string
  ultimoAcesso: string | null
  emailConfirmado: boolean
  bloqueadaAte: string | null
}

export type AcaoAdmin = 'permissao' | 'papel' | 'suspensao' | 'senha' | 'exclusao' | 'transferencia' | 'conta_criada'

export interface EventoAuditoria {
  id: number
  atorEmail: string
  acao: AcaoAdmin
  alvoId: string | null
  alvoEmail: string
  detalhe: string
  em: string
}

export interface AlteracaoSistema {
  id: number
  tabela: string
  registroId: string
  campo: string
  de: string | null
  para: string | null
  userId: string | null
  userEmail: string
  em: string
}

/** Último acesso / e-mail confirmado / bloqueio de cada conta (lido de auth.users por função só de admin). */
export async function listarContasAuth(): Promise<ContaAuth[]> {
  const { data, error } = await supabase.rpc('admin_listar_contas')
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    ultimoAcesso: r.ultimo_acesso,
    emailConfirmado: r.email_confirmado,
    bloqueadaAte: r.bloqueada_ate,
  }))
}

export async function listarAuditoria(opcoes: { limite?: number; alvoId?: string } = {}): Promise<EventoAuditoria[]> {
  let q = supabase
    .from('admin_auditoria')
    .select('id, ator_email, acao, alvo_id, alvo_email, detalhe, created_at')
    .order('created_at', { ascending: false })
    .limit(opcoes.limite ?? 300)
  if (opcoes.alvoId) q = q.eq('alvo_id', opcoes.alvoId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    atorEmail: r.ator_email,
    acao: r.acao as AcaoAdmin,
    alvoId: r.alvo_id,
    alvoEmail: r.alvo_email,
    detalhe: r.detalhe,
    em: r.created_at,
  }))
}

/**
 * Registra no histórico de administração uma ação que passou por Edge
 * Function (lá o banco não sabe qual admin agiu). Nunca lança: a ação em si
 * já foi feita, uma falha aqui só deixa de registrar.
 */
export async function registrarAcao(acao: 'suspensao' | 'senha' | 'exclusao' | 'transferencia', alvoId: string, alvoEmail: string, detalhe: string): Promise<void> {
  try {
    await supabase.rpc('registrar_acao_admin', { p_acao: acao, p_alvo_id: alvoId, p_alvo_email: alvoEmail, p_detalhe: detalhe })
  } catch {
    /* de propósito */
  }
}

/** Alterações feitas nos módulos (OCs, contratos) desde `desdeIso` — admin vê de todo mundo. */
export async function listarAtividadeSistema(desdeIso: string, limite = 1000): Promise<AlteracaoSistema[]> {
  const { data, error } = await supabase
    .from('historico_alteracoes')
    .select('id, tabela, registro_id, campo, de, para, user_id, user_email, created_at')
    .gte('created_at', desdeIso)
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    tabela: r.tabela,
    registroId: r.registro_id,
    campo: r.campo,
    de: r.de,
    para: r.para,
    userId: r.user_id,
    userEmail: r.user_email,
    em: r.created_at,
  }))
}

/** Apaga registros de erro (só admin — RLS). */
export async function excluirErros(ids: string[]): Promise<void> {
  if (!ids.length) return
  const { error } = await supabase.from('erros_app').delete().in('id', ids)
  if (error) throw error
}
