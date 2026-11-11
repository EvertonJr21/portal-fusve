import { supabase } from '@/lib/supabase'
import type { AlteracaoHistorico } from '@/types'

/**
 * Histórico de alterações de OC/contrato (item 93) — gravado por trigger no
 * banco (migration 202611110001), aqui só leitura.
 */
export async function listarHistorico(tabela: 'ocs' | 'contratos', registroId: string | number): Promise<AlteracaoHistorico[]> {
  const { data, error } = await supabase
    .from('historico_alteracoes')
    .select('id, campo, de, para, user_email, created_at')
    .eq('tabela', tabela)
    .eq('registro_id', String(registroId))
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []).map((r) => ({ id: r.id, campo: r.campo, de: r.de, para: r.para, userEmail: r.user_email, em: r.created_at }))
}
