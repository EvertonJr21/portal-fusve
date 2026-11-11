import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import { restaurar, type TabelaRestauravel } from '@/repositories/restauracaoRepository'

/**
 * "Excluído — Desfazer" (item 7 da revisão): em vez de perguntar antes, exclui
 * na hora e oferece desfazer por alguns segundos. Só pra exclusões reversíveis
 * (soft delete) — o que apaga de verdade continua pedindo confirmação.
 */
export function useDesfazer() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useCallback(
    (mensagem: string, tabela: TabelaRestauravel, id: number | string, queryKey: QueryKey) => {
      toast.show(mensagem, 'info', {
        rotulo: 'Desfazer',
        onClick: () => {
          restaurar(tabela, id)
            .then(() => {
              void queryClient.invalidateQueries({ queryKey })
              toast.show('Exclusão desfeita')
            })
            .catch((err) => toast.show(err instanceof Error ? err.message : 'Não foi possível desfazer', 'error'))
        },
      })
    },
    [toast, queryClient],
  )
}
