import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Fornecedor } from '@/types'

interface FornRow {
  id: number
  nome: string
  email: string | null
  wpp: string | null
}

function toFornecedor(row: FornRow): Fornecedor {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email ?? '',
    wpp: row.wpp ?? '',
  }
}

/** Fornecedores são compartilhados entre hospitais — sem filtro de hospital_id. */
export function useFornecedores() {
  return useQuery({
    queryKey: ['forns'],
    queryFn: async (): Promise<Fornecedor[]> => {
      const { data, error } = await supabase
        .from('forns')
        .select('*')
        .is('deleted_at', null)
        .order('nome', { ascending: true })
      if (error) throw error
      return (data as FornRow[]).map(toFornecedor)
    },
  })
}
