import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as histOcRepository from '@/repositories/histOcRepository'

export type { RegistrarCobrancaInput } from '@/repositories/histOcRepository'

/** Adaptador React pro `histOcRepository` — sem SQL/mapeamento aqui (ver ocRepository.ts/useOCs.ts como referência). */
export function useHistOC(ocId: number | null) {
  return useQuery({
    queryKey: ['hist_oc', ocId],
    enabled: ocId !== null,
    queryFn: () => histOcRepository.listarHistOC(ocId as number),
  })
}

/** Última cobrança de cada OC, numa query só — evita N+1 ao popular os cards da Central de Pendências. */
export function useHistoricoRecentePorOC(ocIds: number[]) {
  const ids = [...ocIds].sort((a, b) => a - b)
  return useQuery({
    queryKey: ['hist-recente', ids],
    enabled: ids.length > 0,
    queryFn: () => histOcRepository.listarHistoricoRecentePorOC(ids),
  })
}

/** Toda a tabela hist_oc — só pra agregação de score de fornecedor, não pro dia a dia. */
export function useHistoricoTodos() {
  return useQuery({
    queryKey: ['hist-todos'],
    queryFn: histOcRepository.listarHistoricoTodos,
    staleTime: 60_000,
  })
}

export function useRegistrarCobranca() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: histOcRepository.registrarCobranca,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hist_oc', variables.ocId] })
      queryClient.invalidateQueries({ queryKey: ['hist-recente'] })
    },
  })
}

/** Marca a cobrança como respondida pelo fornecedor — ação rápida de 1 clique (spec item 15). */
export function useMarcarRespondida() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ hid }: { hid: number; ocId: number }) => histOcRepository.marcarRespondida(hid),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hist_oc', variables.ocId] })
      queryClient.invalidateQueries({ queryKey: ['hist-recente'] })
    },
  })
}
