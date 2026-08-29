import { useQuery } from '@tanstack/react-query'

/**
 * Base de 4.579 produtos do SoulMV — carregada via dynamic import só quando
 * o módulo Pareceres é aberto, pra não pesar no bundle principal do app.
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

export function useMarcasSugeridas() {
  return useQuery({
    queryKey: ['marcas-sugeridas'],
    queryFn: async () => {
      const { MARCAS_SUGERIDAS } = await import('@/data/marcasSugeridas')
      return MARCAS_SUGERIDAS
    },
    staleTime: Infinity,
  })
}
