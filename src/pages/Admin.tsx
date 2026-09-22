import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { MODULOS } from '@/constants'
import { useConfirm } from '@/hooks/useConfirm'
import {
  useAlternarSuspensao,
  useExcluirUsuario,
  useMeuPerfil,
  useMinhasPermissoes,
  useReatribuirDados,
  useResetarSenha,
  useSalvarPermissao,
  useSalvarRole,
  useTodasPermissoes,
  useTodosPerfis,
} from '@/hooks/usePermissoes'
import type { Perfil } from '@/repositories/permissaoRepository'
import { useToast } from '@/hooks/useToast'
import { fmt } from '@/utils/date'

function ModalReatribuir({ usuario, outros, onClose }: { usuario: Perfil; outros: Perfil[]; onClose: () => void }) {
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

function ModalResetarSenha({ usuario, onClose }: { usuario: Perfil; onClose: () => void }) {
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
      toast.show(`Senha de ${usuario.email} redefinida`)
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao redefinir senha', 'error')
    }
  }

  return (
    <Modal
      title={`Redefinir senha de ${usuario.email}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
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

function TabelaUsuarios() {
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: meuPerfil } = useMeuPerfil()
  const { data: perfis = [], isLoading: carregandoPerfis, error: erroPerfis } = useTodosPerfis()
  const { data: permissoes = [], isLoading: carregandoPermissoes } = useTodasPermissoes()
  const salvarPermissao = useSalvarPermissao()
  const salvarRole = useSalvarRole()
  const excluirUsuario = useExcluirUsuario()
  const alternarSuspensao = useAlternarSuspensao()
  const [busca, setBusca] = useState('')
  const [reatribuindo, setReatribuindo] = useState<Perfil | null>(null)
  const [resetandoSenha, setResetandoSenha] = useState<Perfil | null>(null)

  const permissaoDe = (userId: string, modulo: string) =>
    permissoes.find((p) => p.userId === userId && p.modulo === modulo)

  const alternar = async (userId: string, modulo: (typeof MODULOS)[number]['chave'], campo: 'podeVer' | 'podeEditar') => {
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

  const alternarRole = async (userId: string, roleAtual: 'admin' | 'user') => {
    const novo = roleAtual === 'admin' ? 'user' : 'admin'
    const msg =
      novo === 'admin'
        ? 'Tornar esse usuário admin? Ele passa a ver e editar os dados de TODOS os usuários em TODOS os módulos.'
        : 'Remover o papel de admin desse usuário? Ele volta a ver só o que as permissões por módulo liberarem.'
    if (!(await confirmar({ message: msg, tone: novo === 'admin' ? 'default' : 'danger', confirmLabel: 'Confirmar' }))) return
    try {
      await salvarRole.mutateAsync({ userId, role: novo })
      toast.show(novo === 'admin' ? 'Usuário promovido a admin' : 'Papel de admin removido')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao alterar papel', 'error')
    }
  }

  const handleExcluir = async (userId: string, email: string) => {
    if (
      !(await confirmar({
        message: `Excluir a conta de ${email}? Isso é permanente — a pessoa perde o acesso imediatamente. Se ela ainda tiver OCs, Pareceres, Contratos ou OPMEs cadastrados, a exclusão é recusada até isso ser resolvido.`,
        tone: 'danger',
        confirmLabel: 'Excluir conta',
      }))
    )
      return
    try {
      await excluirUsuario.mutateAsync(userId)
      toast.show(`Conta de ${email} excluída`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir usuário', 'error')
    }
  }

  const handleAlternarSuspensao = async (userId: string, email: string, suspensaAtual: boolean) => {
    const suspender = !suspensaAtual
    const msg = suspender
      ? `Suspender a conta de ${email}? Ela perde o acesso imediatamente, mas nada é apagado — dá pra reativar depois.`
      : `Reativar a conta de ${email}? Ela volta a conseguir logar normalmente.`
    if (!(await confirmar({ message: msg, tone: suspender ? 'danger' : 'default', confirmLabel: suspender ? 'Suspender' : 'Reativar' })))
      return
    try {
      await alternarSuspensao.mutateAsync({ userId, suspender })
      toast.show(suspender ? `Conta de ${email} suspensa` : `Conta de ${email} reativada`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao alterar suspensão', 'error')
    }
  }

  if (erroPerfis) {
    return <p className="text-sm text-status-red">Erro ao carregar usuários: {erroPerfis.message}</p>
  }

  if (carregandoPerfis || carregandoPermissoes) {
    return <p className="text-sm text-slate-400">Carregando...</p>
  }

  const filtrados = perfis.filter((p) => p.email.toLowerCase().includes(busca.trim().toLowerCase()))

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Buscar por e-mail..."
        className="w-full max-w-xs rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Usuário</th>
              <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Papel</th>
              {MODULOS.map((m) => (
                <th key={m.chave} className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {m.label}
                </th>
              ))}
              <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Criada em</th>
              <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={MODULOS.length + 4} className="px-3 py-8 text-center text-sm text-slate-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((p) => {
              const souEu = p.id === meuPerfil?.id
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs font-medium text-slate-800">
                    {p.email}
                    {souEu && <span className="ml-1 text-slate-400">(você)</span>}
                    {p.suspensa && (
                      <span className="ml-1.5 rounded-full bg-status-red-bg px-1.5 py-0.5 text-[10px] font-semibold text-status-red">
                        Suspensa
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <button
                      type="button"
                      disabled={souEu}
                      onClick={() => alternarRole(p.id, p.role)}
                      title={souEu ? 'Não é possível alterar o próprio papel por aqui' : 'Clique pra alternar'}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        p.role === 'admin' ? 'bg-status-purple-bg text-status-purple' : 'bg-slate-100 text-slate-500'
                      } ${souEu ? 'cursor-not-allowed opacity-60' : 'hover:opacity-80'}`}
                    >
                      {p.role === 'admin' ? 'Admin' : 'Usuário'}
                    </button>
                  </td>
                  {MODULOS.map((m) => {
                    const perm = permissaoDe(p.id, m.chave)
                    const isAdmin = p.role === 'admin'
                    return (
                      <td key={m.chave} className="px-3 py-2 text-center text-xs">
                        {isAdmin ? (
                          <span className="text-slate-300" title="Admin vê e edita tudo, sem precisar de permissão por módulo">
                            — tudo —
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <label className="flex items-center gap-1 text-slate-500" title="Pode ver">
                              <input
                                type="checkbox"
                                checked={perm?.podeVer ?? false}
                                onChange={() => alternar(p.id, m.chave, 'podeVer')}
                              />
                              ver
                            </label>
                            <label className="flex items-center gap-1 text-slate-500" title="Pode criar/editar/excluir">
                              <input
                                type="checkbox"
                                checked={perm?.podeEditar ?? false}
                                onChange={() => alternar(p.id, m.chave, 'podeEditar')}
                              />
                              editar
                            </label>
                          </div>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-xs text-slate-500">{p.criadoEm ? fmt(new Date(p.criadoEm)) : '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex items-center gap-1">
                      <IconButton title="Reatribuir dados pra outra conta" onClick={() => setReatribuindo(p)}>
                        ⇄
                      </IconButton>
                      <IconButton title="Redefinir senha" onClick={() => setResetandoSenha(p)}>
                        🔑
                      </IconButton>
                      <IconButton
                        title={souEu ? 'Não é possível suspender a própria conta' : p.suspensa ? 'Reativar conta' : 'Suspender conta'}
                        tone={p.suspensa ? 'default' : 'danger'}
                        disabled={souEu}
                        onClick={() => handleAlternarSuspensao(p.id, p.email, p.suspensa)}
                      >
                        {p.suspensa ? '▶' : '⏸'}
                      </IconButton>
                      <IconButton
                        title={souEu ? 'Não é possível excluir a própria conta' : 'Excluir conta'}
                        tone="danger"
                        disabled={souEu}
                        onClick={() => handleExcluir(p.id, p.email)}
                      >
                        ✕
                      </IconButton>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {reatribuindo && (
        <ModalReatribuir
          usuario={reatribuindo}
          outros={perfis.filter((o) => o.id !== reatribuindo.id)}
          onClose={() => setReatribuindo(null)}
        />
      )}
      {resetandoSenha && <ModalResetarSenha usuario={resetandoSenha} onClose={() => setResetandoSenha(null)} />}
    </div>
  )
}

export default function Admin() {
  const { data: meuPerfil, isLoading, error } = useMeuPerfil()
  const { data: minhasPermissoes = [] } = useMinhasPermissoes()

  if (isLoading) {
    return <p className="p-6 text-sm text-slate-400">Carregando...</p>
  }

  if (error) {
    return <p className="p-6 text-sm text-status-red">Erro ao carregar seu perfil: {error.message}</p>
  }

  if (meuPerfil?.role !== 'admin') {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-3 px-4 py-14 text-center">
        <h1 className="text-lg font-semibold text-slate-800">Área restrita</h1>
        <p className="text-sm text-slate-500">Essa página é só pra administradores do Portal FUSVE.</p>
        <Link to="/" className="text-sm text-blue-700 hover:underline">
          ← Voltar pros módulos
        </Link>
        {minhasPermissoes.length === 0 && (
          <p className="mt-2 text-xs text-slate-400">
            Sua conta ainda não tem nenhum módulo liberado — peça pro administrador conceder acesso.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div>
        <Link to="/" className="mb-2 inline-block text-xs text-slate-400 hover:text-slate-600">
          ← Módulos
        </Link>
        <h1 className="text-lg font-semibold text-slate-800">Administração</h1>
        <p className="text-sm text-slate-500">
          Usuários do Portal FUSVE e o que cada um pode ver/editar em cada módulo. Contas são criadas pela
          própria pessoa na tela de login — Fornecedores continua compartilhado entre todos, não tem
          controle aqui.
        </p>
      </div>

      <TabelaUsuarios />
    </div>
  )
}
