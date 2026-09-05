import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface MarcaSugeridaRow {
  cat: string
  marcas: string[]
}

/**
 * Marcas de mercado recomendadas por categoria — mostradas quando um produto
 * ainda não tem parecer técnico cadastrado. Editável em `/pareceres/marcas-sugeridas`
 * (antes vivia só em `src/data/marcasSugeridas.json`, exigindo alterar código e
 * fazer deploy pra mudar uma recomendação).
 */
export function useMarcasSugeridas() {
  return useQuery({
    queryKey: ['marcas-sugeridas'],
    queryFn: async (): Promise<Record<string, string[]>> => {
      const { data, error } = await supabase.from('marcas_sugeridas').select('*').order('cat')
      if (error) throw error
      const mapa: Record<string, string[]> = {}
      for (const row of data as MarcaSugeridaRow[]) mapa[row.cat] = row.marcas ?? []
      return mapa
    },
  })
}

export function useSalvarMarcasSugeridas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ cat, marcas }: MarcaSugeridaRow) => {
      const { error } = await supabase.from('marcas_sugeridas').upsert({ cat: cat.trim().toUpperCase(), marcas })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marcas-sugeridas'] }),
  })
}

export function useExcluirMarcasSugeridas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (cat: string) => {
      const { error } = await supabase.from('marcas_sugeridas').delete().eq('cat', cat)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marcas-sugeridas'] }),
  })
}
