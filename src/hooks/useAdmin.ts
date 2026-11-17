import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminRepository from '@/repositories/adminRepository'
import { useMeuPerfil } from './usePermissoes'

/** Hooks da Administração (item 113) — só disparam pra quem é admin. */

function useEhAdmin() {
  const { data: perfil } = useMeuPerfil()
  return perfil?.role === 'admin'
}

/** Último acesso de cada conta. `error` preenchido = migration 202611170001 não rodada. */
export function useContasAuth() {
  const admin = useEhAdmin()
  return useQuery({ queryKey: ['admin-contas'], enabled: admin, queryFn: adminRepository.listarContasAuth, staleTime: 60_000 })
}

export function useAuditoria(alvoId?: string) {
  const admin = useEhAdmin()
  return useQuery({
    queryKey: ['admin-auditoria', alvoId ?? 'todos'],
    enabled: admin,
    queryFn: () => adminRepository.listarAuditoria({ alvoId, limite: alvoId ? 100 : 300 }),
  })
}

export function useAtividadeSistema(dias: number) {
  const admin = useEhAdmin()
  return useQuery({
    queryKey: ['admin-atividade', dias],
    enabled: admin,
    queryFn: () => adminRepository.listarAtividadeSistema(new Date(Date.now() - dias * 86_400_000).toISOString()),
  })
}

export function useExcluirErros() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => adminRepository.excluirErros(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['erros-app'] }),
  })
}
