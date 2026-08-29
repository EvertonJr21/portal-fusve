import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export function useSalvarFornecedor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (forn: Fornecedor) => {
      const { error } = await supabase.from('forns').upsert({
        id: forn.id,
        nome: forn.nome.trim().toUpperCase(),
        email: forn.email || '',
        wpp: forn.wpp.replace(/\D/g, ''),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forns'] })
    },
  })
}

export function useExcluirFornecedor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('forns')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forns'] })
    },
  })
}
