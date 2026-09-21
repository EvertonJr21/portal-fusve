import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as parecerAnexoRepository from '@/repositories/parecerAnexoRepository'
import * as parecerRepository from '@/repositories/parecerRepository'

/** Adaptador React pro `parecerAnexoRepository` — sem SQL/mapeamento aqui. */
export function useAnexosParecer(cod: string) {
  return useQuery({
    queryKey: ['parecer_anexos', cod],
    queryFn: () => parecerAnexoRepository.listarAnexosPorParecer(cod),
  })
}

/** Todos os anexos de todos os pareceres — usado onde a tela lista vários pareceres de uma vez (ex: Base de Pareceres). */
export function useTodosAnexos() {
  return useQuery({
    queryKey: ['parecer_anexos'],
    queryFn: parecerAnexoRepository.listarTodosAnexos,
  })
}

export function useSalvarAnexo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: parecerAnexoRepository.salvarAnexo,
    onSuccess: (_data, { parecerCod }) => {
      queryClient.invalidateQueries({ queryKey: ['parecer_anexos', parecerCod] })
      queryClient.invalidateQueries({ queryKey: ['parecer_anexos'] })
    },
  })
}

export function useExcluirAnexo(cod: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: parecerAnexoRepository.excluirAnexo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parecer_anexos', cod] })
      queryClient.invalidateQueries({ queryKey: ['parecer_anexos'] })
    },
  })
}

/** URL assinada temporária pra abrir/baixar um anexo — mesmo bucket/mecanismo do PDF geral do parecer. */
export function useAbrirAnexo() {
  const obterUrl = useMutation({
    mutationFn: (path: string) => parecerRepository.obterUrlAssinadaPdf(path),
  })
  const abrir = async (path: string) => {
    const url = await obterUrl.mutateAsync(path)
    window.open(url, '_blank', 'noopener')
  }
  return { abrir, isPending: obterUrl.isPending }
}
