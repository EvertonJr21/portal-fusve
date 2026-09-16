import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as marcaSugeridaRepository from '@/repositories/marcaSugeridaRepository'

/**
 * Marcas de mercado recomendadas por categoria — mostradas quando um produto
 * ainda não tem parecer técnico cadastrado. Editável em `/pareceres/marcas-sugeridas`
 * (antes vivia só em `src/data/marcasSugeridas.json`, exigindo alterar código e
 * fazer deploy pra mudar uma recomendação).
 *
 * Adaptador React pro `marcaSugeridaRepository` — sem SQL/mapeamento aqui
 * (ver ocRepository.ts/useOCs.ts como referência).
 */
export function useMarcasSugeridas() {
  return useQuery({
    queryKey: ['marcas-sugeridas'],
    queryFn: marcaSugeridaRepository.listarMarcasSugeridas,
  })
}

export function useSalvarMarcasSugeridas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cat, marcas }: { cat: string; marcas: string[] }) =>
      marcaSugeridaRepository.salvarMarcasSugeridas(cat, marcas),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marcas-sugeridas'] }),
  })
}

export function useExcluirMarcasSugeridas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: marcaSugeridaRepository.excluirMarcasSugeridas,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marcas-sugeridas'] }),
  })
}
