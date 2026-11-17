import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/hooks/useConfirm'
import { useGuardaSaida } from '@/hooks/useGuardaSaida'
import { useReatribuirDados, useResetarSenha } from '@/hooks/usePermissoes'
import { useToast } from '@/hooks/useToast'
import type { Perfil } from '@/repositories/permissaoRepository'
import { registrarAcao } from '@/repositories/adminRepository'

/** Modais de ação sobre uma conta — usados na tabela do Admin e na página do usuário (item 107). */

export function ModalReatribuir({ usuario, outros, onClose }: { usuario: Perfil; outros: Perfil[]; onClose: () => void }) {
  const toast = useToast()
  const confirmar = useConfirm()
  const reatribuir = useReatribuirDados()
  const [destino, setDestino] = useState('')

  const handleConfirmar = async () => {
    if (!destino) return
    const alvo = outros.find((o) => o.id === destino)
    if (
      !(await confirmar({
        message: `Mover todas as OCs, Solicitações, Pareceres, Contratos e OPMEs de ${usuario.email} pra ${alvo?.email}? O histórico é preservado, só o dono muda.`,
        tone: 'default',
        confirmLabel: 'Reatribuir',
      }))
    )
      return
    try {
      await reatribuir.mutateAsync({ deUserId: usuario.id, paraUserId: destino })
      await registrarAcao('transferencia', usuario.id, usuario.email, `Registros transferidos para ${alvo?.email ?? ''}`)
      toast.show(`Dados de ${usuario.email} reatribuídos pra ${alvo?.email}`)
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao reatribuir dados', 'error')
    }
  }

  return (
    <Modal
      title={`Reatribuir dados de ${usuario.email}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={!destino || reatribuir.isPending}>
            {reatribuir.isPending ? 'Reatribuindo...' : 'Reatribuir'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-500">
          Move todo o dado (OCs, Solicitações, Pareceres, Contratos, OPMEs) que hoje é de <strong>{usuario.email}</strong>{' '}
          pra outra conta — útil antes de excluir/suspender alguém que ainda tem registro próprio, ou pra trocar de setor
          sem perder histórico.
        </p>
        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        >
          <option value="">Escolha a conta de destino...</option>
          {outros.map((o) => (
            <option key={o.id} value={o.id}>
              {o.email}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  )
}

export function ModalResetarSenha({ usuario, onClose }: { usuario: Perfil; onClose: () => void }) {
  const guarda = useGuardaSaida(onClose)
  const toast = useToast()
  const resetar = useResetarSenha()
  const [senha, setSenha] = useState('')

  const handleConfirmar = async () => {
    if (senha.length < 8) {
      toast.show('A senha precisa ter pelo menos 8 caracteres', 'error')
      return
    }
    try {
      await resetar.mutateAsync({ userId: usuario.id, novaSenha: senha })
      await registrarAcao('senha', usuario.id, usuario.email, 'Senha redefinida pelo admin')
      toast.show(`Senha de ${usuario.email} redefinida`)
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao redefinir senha', 'error')
    }
  }

  return (
    <Modal
      title={`Redefinir senha de ${usuario.email}`}
      onClose={guarda.fechar}
      onInput={guarda.marcar}
      closeOnBackdrop={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={guarda.fechar}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={senha.length < 8 || resetar.isPending}>
            {resetar.isPending ? 'Salvando...' : 'Redefinir senha'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-500">
          Define uma senha nova pra essa conta, sem passar pelo e-mail de "esqueci minha senha". Avise a pessoa pelo
          canal que preferir.
        </p>
        <input
          type="password"
          autoFocus
          placeholder="Nova senha (mín. 8 caracteres)"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>
    </Modal>
  )
}
