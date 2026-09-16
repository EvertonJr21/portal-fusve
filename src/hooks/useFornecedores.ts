import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as fornecedorRepository from '@/repositories/fornecedorRepository'

/** Adaptador React pro `fornecedorRepository` — sem SQL/mapeamento aqui (ver ocRepository.ts/useOCs.ts como referência). */
export function useFornecedores() {
  return useQuery({
    queryKey: ['forns'],
    queryFn: fornecedorRepository.listarFornecedores,
  })
}

export function useSalvarFornecedor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fornecedorRepository.salvarFornecedor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forns'] })
    },
  })
}

export function useExcluirFornecedor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fornecedorRepository.excluirFornecedor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forns'] })
    },
  })
}
