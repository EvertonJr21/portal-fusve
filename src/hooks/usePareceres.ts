import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as parecerRepository from '@/repositories/parecerRepository'

/** Adaptador React pro `parecerRepository` — sem SQL/mapeamento aqui (ver ocRepository.ts/useOCs.ts como referência). */
export function usePareceres() {
  return useQuery({
    queryKey: ['pareceres'],
    queryFn: parecerRepository.listarPareceres,
  })
}

export function useParecer(cod: string | null) {
  return useQuery({
    queryKey: ['parecer', cod],
    enabled: !!cod,
    queryFn: () => parecerRepository.buscarParecer(cod as string),
  })
}

export function useSalvarParecer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: parecerRepository.salvarParecer,
    onSuccess: (_data, p) => {
      queryClient.invalidateQueries({ queryKey: ['pareceres'] })
      queryClient.invalidateQueries({ queryKey: ['parecer', p.cod] })
    },
  })
}

export function useExcluirParecer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: parecerRepository.excluirParecer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pareceres'] })
    },
  })
}
