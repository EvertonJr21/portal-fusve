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

/**
 * Mesmo patch em várias OCs (ações em lote da tela de OCs, item 82) — uma
 * invalidação no fim, em vez de recarregar a lista inteira a cada OC.
 */
export function useAtualizarOCsEmLote(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, patch }: { ids: number[]; patch: Parameters<typeof ocRepository.atualizarCamposOC>[1] }) => {
      for (const id of ids) await ocRepository.atualizarCamposOC(id, patch)
    },
    onSettled: () => {
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
