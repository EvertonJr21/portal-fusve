import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Sem retry automático: o retry combinado com a detecção de "offline" do
      // TanStack Query deixava a query presa em fetchStatus 'paused' indefinidamente
      // em vez de reportar o erro real (reproduzido com a tabela `contratos`
      // inexistente — falhava uma vez e nunca chegava a status 'error'). Falhar
      // rápido e mostrar o erro é melhor do que travar em "carregando" pra sempre.
      retry: false,
      refetchOnWindowFocus: false,
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
})
