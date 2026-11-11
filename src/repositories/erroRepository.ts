import { supabase } from '@/lib/supabase'

/**
 * Registro automático de erros da tela (tabela `erros_app`, migration
 * 202611110001). Nunca lança: registrar um erro não pode gerar outro — se a
 * tabela não existir ou a gravação falhar, só ignora.
 */
export interface ErroApp {
  id: string
  mensagem: string
  detalhe: string
  url: string
  userEmail: string
  criadoEm: string
}

let ultimo = ''
let quantos = 0
const MAX_POR_SESSAO = 20

export async function registrarErro(mensagem: string, detalhe = ''): Promise<void> {
  try {
    const chave = mensagem.slice(0, 200)
    // Mesmo erro repetido (ex.: em laço de render) ou erro demais na mesma sessão: não inunda a tabela.
    if (chave === ultimo || quantos >= MAX_POR_SESSAO) return
    ultimo = chave
    quantos++
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    await supabase.from('erros_app').insert({
      mensagem: mensagem.slice(0, 500),
      detalhe: detalhe.slice(0, 4000),
      url: window.location.pathname + window.location.search,
      user_email: data.session.user.email ?? '',
      navegador: navigator.userAgent.slice(0, 300),
    })
  } catch {
    /* de propósito */
  }
}

export async function listarErros(limite = 50): Promise<ErroApp[]> {
  const { data, error } = await supabase
    .from('erros_app')
    .select('id, mensagem, detalhe, url, user_email, created_at')
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    mensagem: r.mensagem,
    detalhe: r.detalhe ?? '',
    url: r.url ?? '',
    userEmail: r.user_email ?? '',
    criadoEm: r.created_at,
  }))
}
