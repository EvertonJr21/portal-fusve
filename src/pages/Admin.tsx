import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { MODULOS } from '@/constants'
import { useConfirm } from '@/hooks/useConfirm'
import {
  useMeuPerfil,
  useMinhasPermissoes,
  useSalvarPermissao,
  useSalvarRole,
  useTodasPermissoes,
  useTodosPerfis,
} from '@/hooks/usePermissoes'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'

function CriarUsuarioForm() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (password.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setEnviando(true)
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email, password },
    })
    setEnviando(false)

    if (error || data?.error) {
      setErro(data?.error ?? 'Não foi possível criar o usuário.')
      return
    }

    toast.show(`Conta criada para ${email} — sem nenhum módulo liberado ainda, conceda abaixo`)
    setEmail('')
    setPassword('')
    setConfirmar('')
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-soft-sm">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">Criar usuário</h2>
      <p className="mb-4 text-xs text-slate-500">
        A conta é criada direto, sem envio de e-mail — combine a senha com a pessoa por fora. Ela nasce sem nenhum
        módulo liberado; conceda o acesso na lista abaixo.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:max-w-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="off"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="confirmar">
            Confirmar senha
          </label>
          <input
            id="confirmar"
            type="password"
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
        </div>
        {erro && <p className="text-sm text-status-red">{erro}</p>}
        <Button type="submit" disabled={enviando} className="mt-1 self-start">
          {enviando ? 'Criando...' : 'Criar usuário'}
        </Button>
      </form>
    </div>
  )
}

function TabelaPermissoes() {
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: meuPerfil } = useMeuPerfil()
  const { data: perfis = [], isLoading: carregandoPerfis, error: erroPerfis } = useTodosPerfis()
  const { data: permissoes = [], isLoading: carregandoPermissoes } = useTodasPermissoes()
  const salvarPermissao = useSalvarPermissao()
  const salvarRole = useSalvarRole()

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

  if (erroPerfis) {
    return <p className="text-sm text-status-red">Erro ao carregar usuários: {erroPerfis.message}</p>
  }

  if (carregandoPerfis || carregandoPermissoes) {
    return <p className="text-sm text-slate-400">Carregando...</p>
  }

  return (
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
          </tr>
        </thead>
        <tbody>
          {perfis.map((p) => {
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
              </tr>
            )
          })}
        </tbody>
      </table>
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
          Usuários do Portal FUSVE e o que cada um pode ver/editar em cada módulo. Fornecedores continua
          compartilhado entre todos, não tem controle aqui.
        </p>
      </div>

      <CriarUsuarioForm />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Usuários e permissões</h2>
        <TabelaPermissoes />
      </div>
    </div>
  )
}
