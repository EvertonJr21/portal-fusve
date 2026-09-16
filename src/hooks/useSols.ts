import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { HospitalId } from '@/constants'
import * as solRepository from '@/repositories/solRepository'

export type { SalvarSolInput } from '@/repositories/solRepository'

/** Adaptador React pro `solRepository` — sem SQL/mapeamento aqui (ver ocRepository.ts/useOCs.ts como referência). */
export function useSols(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['sols', hospitalId],
    queryFn: () => solRepository.listarSols(hospitalId),
  })
}

export function useSalvarSol(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: solRepository.salvarSol,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sols', hospitalId] })
    },
  })
}

export function useAtualizarSituacaoSol(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sit }: { id: number; sit: string }) => solRepository.atualizarSituacaoSol(id, sit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sols', hospitalId] })
    },
  })
}

export function useExcluirSol(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: solRepository.excluirSol,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sols', hospitalId] })
    },
  })
}
