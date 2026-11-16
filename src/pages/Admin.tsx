import { Eye } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ModalReatribuir, ModalResetarSenha } from '@/components/admin/ModaisUsuario'
import { IconButton } from '@/components/ui/IconButton'
import { MODULOS } from '@/constants'
import { useAcoesUsuario } from '@/hooks/useAcoesUsuario'
import { useMeuPerfil, useMinhasPermissoes, useTodasPermissoes, useTodosPerfis } from '@/hooks/usePermissoes'
import type { Perfil } from '@/repositories/permissaoRepository'
import { fmt } from '@/utils/date'
import { useErrosApp } from '@/hooks/useHistorico'
import { dataHora } from '@/utils/historico'

function TabelaUsuarios() {
  const navigate = useNavigate()
  const { data: meuPerfil } = useMeuPerfil()
  const { data: perfis = [], isLoading: carregandoPerfis, error: erroPerfis } = useTodosPerfis()
  const { isLoading: carregandoPermissoes } = useTodasPermissoes()
  const acoes = useAcoesUsuario()
  const { permissaoDe } = acoes
  const [busca, setBusca] = useState('')
  const [reatribuindo, setReatribuindo] = useState<Perfil | null>(null)
  const [resetandoSenha, setResetandoSenha] = useState<Perfil | null>(null)
  const alternar = acoes.alternarPermissao
  const alternarRole = acoes.alternarRole
  const handleExcluir = acoes.excluir
  const handleAlternarSuspensao = acoes.alternarSuspensao

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
                    <Link to={`/admin/usuarios/${p.id}`} className="hover:text-blue-700 hover:underline">
                      {p.email}
                    </Link>
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
                      <IconButton title="Abrir página do usuário" onClick={() => navigate(`/admin/usuarios/${p.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </IconButton>
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
      <ErrosRegistrados />
    </div>
  )
}

/** Erros de tela registrados automaticamente (item 95) — os 50 mais recentes. */
function ErrosRegistrados() {
  const { data: erros, error, isLoading } = useErrosApp(true)
  const [aberto, setAberto] = useState<string | null>(null)

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Erros registrados</h2>
        <p className="text-xs text-slate-500">
          Quando uma tela quebra para alguém, o erro aparece aqui automaticamente — sem depender de print.
        </p>
      </div>
      {isLoading ? (
        <p className="text-xs text-slate-400">Carregando…</p>
      ) : error ? (
        <p className="text-xs text-slate-400">Registro de erros indisponível — rode a migration 202611110001 no Supabase.</p>
      ) : !erros?.length ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">Nenhum erro registrado.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {erros.map((e) => (
            <li key={e.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
              <button type="button" className="w-full text-left" onClick={() => setAberto(aberto === e.id ? null : e.id)}>
                <div className="font-medium text-status-red">{e.mensagem}</div>
                <div className="text-[11px] text-slate-400">
                  {dataHora(e.criadoEm)} · {e.userEmail || 'sem usuário'} · {e.url}
                </div>
              </button>
              {aberto === e.id && e.detalhe && (
                <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-[10px] text-slate-600">{e.detalhe}</pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
