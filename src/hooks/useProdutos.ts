import { useQuery } from '@tanstack/react-query'

/**
 * Catálogo de produtos do SoulMV (ver `src/data/produtos.ts`) — carregado via dynamic
 * import só quando uma tela que busca produto é aberta (Pareceres, formulário de
 * Contratos), pra não pesar no bundle principal do app.
 */
export function useProdutos() {
  return useQuery({
    queryKey: ['produtos-soulmv'],
    queryFn: async () => {
      const { PRODUTOS_SOULMV } = await import('@/data/produtos')
      return PRODUTOS_SOULMV
    },
    staleTime: Infinity,
  })
}

