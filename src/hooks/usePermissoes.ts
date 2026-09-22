import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ModuloChave } from '@/constants'
import * as permissaoRepository from '@/repositories/permissaoRepository'
import { useAuth } from './useAuth'

/** Perfil (role) do usuário logado — null enquanto carrega ou sem sessão. */
export function useMeuPerfil() {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['profiles', 'me', userId],
    queryFn: () => permissaoRepository.buscarMeuPerfil(userId!),
    enabled: !!userId,
  })
}

/** Minhas permissões por módulo (vazio = admin, que não precisa de linha própria pra ver tudo). */
export function useMinhasPermissoes() {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['permissoes_modulo', 'minhas', userId],
    queryFn: () => permissaoRepository.buscarMinhasPermissoes(userId!),
    enabled: !!userId,
  })
}

/**
 * `{ carregando, isAdmin, podeVer, podeEditar }` pro módulo pedido — admin
 * sempre true nos dois, sem precisar de linha em `permissoes_modulo`
 * (mesmo bypass que a RLS já faz no banco, ver `is_admin()` na migration).
 */
export function usePermissaoModulo(modulo: ModuloChave) {
  const { data: perfil, isLoading: carregandoPerfil } = useMeuPerfil()
  const { data: permissoes, isLoading: carregandoPermissoes } = useMinhasPermissoes()

  const isAdmin = perfil?.role === 'admin'
  const linha = permissoes?.find((p) => p.modulo === modulo)

  return {
    carregando: carregandoPerfil || carregandoPermissoes,
    isAdmin,
    podeVer: isAdmin || !!linha?.podeVer,
    podeEditar: isAdmin || !!linha?.podeEditar,
  }
}

// ---- Admin: gestão de usuários e permissões ----

export function useTodosPerfis() {
  const { data: perfil } = useMeuPerfil()
  return useQuery({
    queryKey: ['profiles', 'todos'],
    queryFn: permissaoRepository.listarPerfis,
    enabled: perfil?.role === 'admin',
  })
}

export function useTodasPermissoes() {
  const { data: perfil } = useMeuPerfil()
  return useQuery({
    queryKey: ['permissoes_modulo', 'todas'],
    queryFn: permissaoRepository.listarTodasPermissoes,
    enabled: perfil?.role === 'admin',
  })
}

export function useSalvarPermissao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, modulo, podeVer, podeEditar }: { userId: string; modulo: ModuloChave; podeVer: boolean; podeEditar: boolean }) =>
      permissaoRepository.salvarPermissao(userId, modulo, podeVer, podeEditar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissoes_modulo'] })
    },
  })
}

export function useSalvarRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => permissaoRepository.salvarRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

export function useExcluirUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => permissaoRepository.excluirUsuario(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['permissoes_modulo'] })
    },
  })
}

/** Admin: transfere OCs/Sols/Pareceres/Contratos/OPMEs de uma conta pra outra. */
export function useReatribuirDados() {
  return useMutation({
    mutationFn: ({ deUserId, paraUserId }: { deUserId: string; paraUserId: string }) =>
      permissaoRepository.reatribuirDados(deUserId, paraUserId),
  })
}

export function useAlternarSuspensao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, suspender }: { userId: string; suspender: boolean }) =>
      permissaoRepository.alternarSuspensao(userId, suspender),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

export function useResetarSenha() {
  return useMutation({
    mutationFn: ({ userId, novaSenha }: { userId: string; novaSenha: string }) =>
      permissaoRepository.resetarSenha(userId, novaSenha),
  })
}
