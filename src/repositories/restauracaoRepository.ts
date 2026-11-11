import { supabase } from '@/lib/supabase'

/** Tabelas com exclusão reversível (soft delete por `deleted_at`). */
export type TabelaRestauravel = 'ocs' | 'sols' | 'forns' | 'contratos' | 'opmes'

/** Desfaz uma exclusão: limpa o `deleted_at` (a exclusão nunca apaga a linha — regra 6). */
export async function restaurar(tabela: TabelaRestauravel, id: number | string): Promise<void> {
  // `id` é número em ocs/sols/forns e uuid em contratos/opmes — o tipo gerado não cobre a união.
  const { error } = await supabase.from(tabela).update({ deleted_at: null }).eq('id', id as never)
  if (error) throw error
}
