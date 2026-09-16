import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { HospitalId } from '@/constants'
import * as ocRepository from '@/repositories/ocRepository'
import type { SituacaoOC } from '@/types'

export type { SalvarOCInput } from '@/repositories/ocRepository'

/**
 * Adaptador React pro `ocRepository` — sem SQL, sem mapeamento de linha, sem
 * regra de negócio aqui (ver CLAUDE_ENGINEERING.md, seção 17). Todo acesso a
 * `ocs` no Supabase vive em `src/repositories/ocRepository.ts`.
 */
export function useOCs(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['ocs', hospitalId],
    queryFn: () => ocRepository.listarOCs(hospitalId),
  })
}

export function useSalvarOC(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ocRepository.salvarOC,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    },
  })
}

export function useAtualizarSituacaoOC(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sit }: { id: number; sit: SituacaoOC }) => ocRepository.atualizarSituacaoOC(id, sit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    },
  })
}

/** Atualização parcial de campos operacionais (histórico, vínculo, cobrança) — não é o form de criar/editar. */
export function useAtualizarOC(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof ocRepository.atualizarCamposOC>[1] }) =>
      ocRepository.atualizarCamposOC(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    },
  })
}

export function useExcluirOC(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ocRepository.excluirOC,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    },
  })
}
