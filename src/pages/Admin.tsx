import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconButton } from '@/components/ui/IconButton'
import { MODULOS } from '@/constants'
import { useConfirm } from '@/hooks/useConfirm'
import {
  useExcluirUsuario,
  useMeuPerfil,
  useMinhasPermissoes,
  useSalvarPermissao,
  useSalvarRole,
  useTodasPermissoes,
  useTodosPerfis,
} from '@/hooks/usePermissoes'
import { useToast } from '@/hooks/useToast'
import { fmt } from '@/utils/date'

function TabelaUsuarios() {
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: meuPerfil } = useMeuPerfil()
  const { data: perfis = [], isLoading: carregandoPerfis, error: erroPerfis } = useTodosPerfis()
  const { data: permissoes = [], isLoading: carregandoPermissoes } = useTodasPermissoes()
  const salvarPermissao = useSalvarPermissao()
  const salvarRole = useSalvarRole()
  const excluirUsuario = useExcluirUsuario()
  const [busca, setBusca] = useState('')

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
                    <IconButton
                      title={souEu ? 'Não é possível excluir a própria conta' : 'Excluir conta'}
                      tone="danger"
                      disabled={souEu}
                      onClick={() => handleExcluir(p.id, p.email)}
                    >
                      ✕
                    </IconButton>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
