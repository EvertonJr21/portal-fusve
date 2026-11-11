import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { HospitalId } from '@/constants'
import * as contratoRepository from '@/repositories/contratoRepository'
import type { ContratoProduto } from '@/types'
import type { SalvarComodatosInput } from '@/repositories/contratoRepository'

/** Adaptador React pro `contratoRepository` — sem SQL/mapeamento aqui (ver ocRepository.ts/useOCs.ts como referência). */
export function useContratos(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['contratos', hospitalId],
    queryFn: () => contratoRepository.listarContratos(hospitalId),
  })
}

export function useContratoProdutos(contratoId: string | null) {
  return useQuery({
    queryKey: ['contrato-produtos', contratoId],
    enabled: !!contratoId,
    queryFn: () => contratoRepository.listarContratoProdutos(contratoId as string),
  })
}

export function useSalvarContrato(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: contratoRepository.salvarContrato,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', hospitalId] })
    },
  })
}

export function useSalvarProdutosContrato() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { contratoId: string; produtosAtuais: ContratoProduto[]; produtosOriginais: ContratoProduto[] }) =>
      contratoRepository.salvarProdutosContrato(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contrato-produtos', variables.contratoId] })
    },
  })
}

export function useExcluirContrato(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: contratoRepository.excluirContrato,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', hospitalId] })
    },
  })
}

/** Equipamentos em comodato do contrato (item 83). */
export function useContratoComodatos(contratoId: string | null) {
  return useQuery({
    queryKey: ['contrato-comodatos', contratoId],
    enabled: !!contratoId,
    queryFn: () => contratoRepository.listarContratoComodatos(contratoId as string),
  })
}

/** Todos os comodatos de vários contratos — contagem na Tabela Mestre. */
export function useComodatosPorContrato(contratoIds: string[]) {
  const ids = [...contratoIds].sort()
  return useQuery({
    queryKey: ['contrato-comodatos-contagem', ids],
    enabled: ids.length > 0,
    queryFn: () => contratoRepository.contarComodatosPorContrato(ids),
  })
}

export function useSalvarComodatosContrato() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SalvarComodatosInput) => contratoRepository.salvarComodatosContrato(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contrato-comodatos', variables.contratoId] })
      queryClient.invalidateQueries({ queryKey: ['contrato-comodatos-contagem'] })
    },
  })
}

/** Renovação de contrato: cria a cópia com vigência nova (item 98). */
export function useRenovarContrato(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: contratoRepository.renovarContrato,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', hospitalId] })
    },
  })
}

/** PDF do contrato assinado: sobe o arquivo e vincula; `file: null` remove o vínculo. */
export function useDefinirPdfContrato(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ contratoId, file }: { contratoId: string; file: File | null }) => {
      if (!file) return contratoRepository.definirPdfContrato(contratoId, null, null)
      const path = await contratoRepository.uploadPdfContrato(contratoId, file)
      return contratoRepository.definirPdfContrato(contratoId, path, file.name)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', hospitalId] })
    },
  })
}

export function useAbrirPdfContrato() {
  return useMutation({
    mutationFn: async (path: string) => {
      const url = await contratoRepository.urlAssinadaPdfContrato(path)
      window.open(url, '_blank', 'noopener')
    },
  })
}
