import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { HospitalId, StatusOpme } from '@/constants'
import * as opmeRepository from '@/repositories/opmeRepository'
import type { Opme } from '@/types'

/** Adaptador React pro `opmeRepository` — sem SQL/mapeamento aqui (ver ocRepository.ts/useOCs.ts como referência). */
export function useOpmes(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['opmes', hospitalId],
    queryFn: () => opmeRepository.listarOpmes(hospitalId),
  })
}

export function useSalvarOpme(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (o: Omit<Opme, 'id'> & { id?: string }) => opmeRepository.salvarOpme(o),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opmes', hospitalId] })
    },
  })
}

export function useAlternarStatusOpme(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusOpme }) => opmeRepository.alternarStatusOpme(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opmes', hospitalId] })
    },
  })
}

export function useExcluirOpme(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: opmeRepository.excluirOpme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opmes', hospitalId] })
    },
  })
}
