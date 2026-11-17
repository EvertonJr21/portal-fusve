import type { ModuloChave } from '@/constants'

export type NivelAcesso = 'nenhum' | 'ver' | 'editar'
import { useConfirm } from '@/hooks/useConfirm'
import { useAlternarSuspensao, useExcluirUsuario, useSalvarPermissao, useSalvarRole, useTodasPermissoes } from '@/hooks/usePermissoes'
import { useToast } from '@/hooks/useToast'
import { registrarAcao } from '@/repositories/adminRepository'

/**
 * Ações de admin sobre uma conta (permissão por módulo, papel, suspensão e
 * exclusão), com as confirmações — usadas na tabela do Admin e na página do
 * usuário (item 107). Cada ação devolve `true` quando foi feita.
 */
export function useAcoesUsuario() {
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: permissoes = [] } = useTodasPermissoes()
  const salvarPermissao = useSalvarPermissao()
  const salvarRole = useSalvarRole()
  const excluirUsuario = useExcluirUsuario()
  const suspensao = useAlternarSuspensao()

  const permissaoDe = (userId: string, modulo: string) => permissoes.find((p) => p.userId === userId && p.modulo === modulo)

  const alternarPermissao = async (userId: string, modulo: ModuloChave, campo: 'podeVer' | 'podeEditar') => {
    const atual = permissaoDe(userId, modulo)
    const podeVer = campo === 'podeVer' ? !(atual?.podeVer ?? false) : (atual?.podeVer ?? false)
    const podeEditar = campo === 'podeEditar' ? !(atual?.podeEditar ?? false) : (atual?.podeEditar ?? false)
    // Editar sem poder ver não faz sentido — marcar editar liga ver junto.
    const podeVerFinal = podeEditar ? true : podeVer
    try {
      await salvarPermissao.mutateAsync({ userId, modulo, podeVer: podeVerFinal, podeEditar })
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar permissão', 'error')
    }
  }

  /** Nível de acesso de um módulo: sem acesso, só ver, ver e editar. */
  const definirNivel = async (userId: string, modulo: ModuloChave, nivel: NivelAcesso) => {
    try {
      await salvarPermissao.mutateAsync({ userId, modulo, podeVer: nivel !== 'nenhum', podeEditar: nivel === 'editar' })
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar permissão', 'error')
    }
  }

  const nivelDe = (userId: string, modulo: string): NivelAcesso => {
    const p = permissaoDe(userId, modulo)
    return p?.podeEditar ? 'editar' : p?.podeVer ? 'ver' : 'nenhum'
  }

  const alternarRole = async (userId: string, roleAtual: 'admin' | 'user') => {
    const novo = roleAtual === 'admin' ? 'user' : 'admin'
    const msg =
      novo === 'admin'
        ? 'Tornar esse usuário admin? Ele passa a ver e editar os dados de TODOS os usuários em TODOS os módulos.'
        : 'Remover o papel de admin desse usuário? Ele volta a ver só o que as permissões por módulo liberarem.'
    if (!(await confirmar({ message: msg, tone: novo === 'admin' ? 'default' : 'danger', confirmLabel: 'Confirmar' }))) return false
    try {
      await salvarRole.mutateAsync({ userId, role: novo })
      toast.show(novo === 'admin' ? 'Usuário promovido a admin' : 'Papel de admin removido')
      return true
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao alterar papel', 'error')
      return false
    }
  }

  const excluir = async (userId: string, email: string) => {
    if (
      !(await confirmar({
        message: `Excluir a conta de ${email}? Isso é permanente — a pessoa perde o acesso imediatamente. Se ela ainda tiver OCs, Pareceres, Contratos ou OPMEs cadastrados, a exclusão é recusada até isso ser resolvido.`,
        tone: 'danger',
        confirmLabel: 'Excluir conta',
      }))
    )
      return false
    try {
      await excluirUsuario.mutateAsync(userId)
      await registrarAcao('exclusao', userId, email, 'Conta excluída')
      toast.show(`Conta de ${email} excluída`)
      return true
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir usuário', 'error')
      return false
    }
  }

  const alternarSuspensao = async (userId: string, email: string, suspensaAtual: boolean) => {
    const suspender = !suspensaAtual
    const msg = suspender
      ? `Suspender a conta de ${email}? Ela perde o acesso imediatamente, mas nada é apagado — dá pra reativar depois.`
      : `Reativar a conta de ${email}? Ela volta a conseguir logar normalmente.`
    if (!(await confirmar({ message: msg, tone: suspender ? 'danger' : 'default', confirmLabel: suspender ? 'Suspender' : 'Reativar' })))
      return false
    try {
      await suspensao.mutateAsync({ userId, suspender })
      await registrarAcao('suspensao', userId, email, suspender ? 'Conta suspensa' : 'Conta reativada')
      toast.show(suspender ? `Conta de ${email} suspensa` : `Conta de ${email} reativada`)
      return true
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao alterar suspensão', 'error')
      return false
    }
  }

  return { permissaoDe, nivelDe, definirNivel, alternarPermissao, alternarRole, excluir, alternarSuspensao }
}
