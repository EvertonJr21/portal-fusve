import { FileDown, KeyRound, Pause, Play, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AvisoMigracao, Avatar, CabecalhoAdmin, SeloPapel, SeloStatus } from '@/components/admin/AdminUi'
import { ModalResetarSenha } from '@/components/admin/ModaisUsuario'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { MODULOS } from '@/constants'
import { useAcoesUsuario } from '@/hooks/useAcoesUsuario'
import { useContasAuth } from '@/hooks/useAdmin'
import { useMeuPerfil, useTodasPermissoes, useTodosPerfis } from '@/hooks/usePermissoes'
import { useToast } from '@/hooks/useToast'
import type { Perfil } from '@/repositories/permissaoRepository'
import { rotuloCurto, STATUS_CONTA, statusConta, tempoRelativo, type StatusConta } from '@/utils/admin'
import { fmt } from '@/utils/date'
import { dataHora } from '@/utils/historico'
import { abrirPdfGerado } from '@/utils/pdfDataUrl'

const FILTROS: { valor: 'todas' | StatusConta; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'ativa', rotulo: 'Ativas' },
  { valor: 'inativa', rotulo: 'Inativas' },
  { valor: 'nunca_entrou', rotulo: 'Nunca entraram' },
  { valor: 'suspensa', rotulo: 'Suspensas' },
]

/** Lista de usuários da Administração (item 113), no padrão de consoles de admin: status, último acesso, módulos e ações. */
export default function Usuarios() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const { data: eu } = useMeuPerfil()
  const { data: perfis = [], isLoading, error } = useTodosPerfis()
  const { data: permissoes = [] } = useTodasPermissoes()
  const { data: contas, error: erroContas } = useContasAuth()
  const acoes = useAcoesUsuario()
  const [busca, setBusca] = useState('')
  const [papel, setPapel] = useState<'todos' | 'admin' | 'user'>('todos')
  const [senhaDe, setSenhaDe] = useState<Perfil | null>(null)
  const [gerando, setGerando] = useState(false)
  const filtro = (FILTROS.some((f) => f.valor === params.get('status')) ? params.get('status') : 'todas') as 'todas' | StatusConta

  const authDe = useMemo(() => new Map((contas ?? []).map((c) => [c.id, c])), [contas])
  const linhas = useMemo(
    () =>
      perfis.map((p) => {
        const auth = authDe.get(p.id)
        const modulos = MODULOS.map((m) => {
          const x = permissoes.find((y) => y.userId === p.id && y.modulo === m.chave)
          return { ...m, nivel: p.role === 'admin' || x?.podeEditar ? 'editar' : x?.podeVer ? 'ver' : 'nenhum' }
        })
        return { p, auth, status: statusConta(p, auth), modulos }
      }),
    [perfis, authDe, permissoes],
  )
  const contagem = (s: 'todas' | StatusConta) => (s === 'todas' ? linhas.length : linhas.filter((l) => l.status === s).length)
  const termo = busca.trim().toLowerCase()
  const visiveis = linhas
    .filter((l) => filtro === 'todas' || l.status === filtro)
    .filter((l) => papel === 'todos' || l.p.role === papel)
    .filter((l) => !termo || l.p.email.toLowerCase().includes(termo) || l.p.nome.toLowerCase().includes(termo))
    .sort((a, b) => (b.auth?.ultimoAcesso ?? '').localeCompare(a.auth?.ultimoAcesso ?? '') || a.p.email.localeCompare(b.p.email))

  const exportar = async () => {
    setGerando(true)
    try {
      await abrirPdfGerado(async () => {
        const { gerarRelatorioTabelaPDF } = await import('@/relatorios/tabela')
        return gerarRelatorioTabelaPDF({
          barra: 'Administração · Contas e acessos',
          rotulo: 'Administração',
          titulo: 'Contas e acessos',
          subtitulo: FILTROS.find((f) => f.valor === filtro)?.rotulo === 'Todas' ? 'Todas as contas' : `Filtro: ${FILTROS.find((f) => f.valor === filtro)?.rotulo}`,
          numeros: [
            { rotulo: 'Contas', valor: String(linhas.length) },
            { rotulo: 'Ativas em 30 dias', valor: contas ? String(contagem('ativa')) : '—' },
            { rotulo: 'Suspensas', valor: String(contagem('suspensa')) },
          ],
          colunas: [
            { titulo: 'Conta' },
            { titulo: 'Papel', largura: 54 },
            { titulo: 'Situação', largura: 70 },
            { titulo: 'Último acesso', largura: 90 },
            ...MODULOS.map((m) => ({ titulo: m.label, largura: 78 })),
          ],
          linhas: visiveis.map((l) => [
            l.p.email,
            l.p.role === 'admin' ? 'Admin' : 'Usuário',
            l.status ? STATUS_CONTA[l.status].rotulo : '—',
            l.auth ? (l.auth.ultimoAcesso ? dataHora(l.auth.ultimoAcesso) : 'Nunca') : '—',
            ...l.modulos.map((m) => (m.nivel === 'editar' ? 'Ver e editar' : m.nivel === 'ver' ? 'Só ver' : 'Sem acesso')),
          ]),
          nota: 'Administradores veem e editam todos os módulos. Cada usuário comum só vê os próprios registros nos módulos liberados.',
        })
      }, 'Contas e acessos — Portal FUSVE')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao gerar o PDF', 'error')
    } finally {
      setGerando(false)
    }
  }

  if (isLoading) return <SkeletonRows />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar usuários: {error.message}</p>

  return (
    <>
      <CabecalhoAdmin
        titulo="Usuários"
        descricao="Quem tem conta no portal, quando entrou pela última vez e o que pode acessar. Contas novas são criadas pela própria pessoa na tela de login e já nascem com os módulos liberados."
        acoes={
          <Button variant="outline" onClick={exportar} loading={gerando} disabled={!visiveis.length}>
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
        }
      />
      {erroContas && <AvisoMigracao />}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Situação da conta">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={filtro === f.valor}
              onClick={() => setParams(f.valor === 'todas' ? {} : { status: f.valor }, { replace: true })}
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                filtro === f.valor ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f.rotulo} <span className="tabular-nums opacity-70">{f.valor === 'todas' || contas || f.valor === 'suspensa' ? contagem(f.valor) : '—'}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
            <span className="sr-only">Buscar por e-mail</span>
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por e-mail ou nome"
              className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-2 text-sm"
            />
          </label>
          <select aria-label="Papel" value={papel} onChange={(e) => setPapel(e.target.value as typeof papel)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
            <option value="todos">Todos os papéis</option>
            <option value="admin">Admins</option>
            <option value="user">Usuários</option>
          </select>
        </div>
      </div>

      {/* Computador: tabela */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-soft-sm md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Usuário</th>
              <th className="px-3 py-2.5">Papel</th>
              <th className="px-3 py-2.5">Situação</th>
              <th className="px-3 py-2.5">Último acesso</th>
              <th className="px-3 py-2.5">Módulos</th>
              <th className="px-3 py-2.5">Criada em</th>
              <th className="px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!visiveis.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Nenhuma conta com esses filtros.</td>
              </tr>
            )}
            {visiveis.map(({ p, auth, status, modulos }) => {
              const souEu = p.id === eu?.id
              return (
                <tr key={p.id} onClick={() => navigate(`/admin/usuarios/${p.id}`)} className="group cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar email={p.email} />
                      <div className="min-w-0">
                        <Link to={`/admin/usuarios/${p.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-slate-900 hover:text-blue-700 hover:underline">
                          {p.email}
                        </Link>
                        <span className="text-xs text-slate-500">{souEu ? 'você' : p.nome || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><SeloPapel admin={p.role === 'admin'} /></td>
                  <td className="px-3 py-2.5"><SeloStatus status={status} /></td>
                  <td className="px-3 py-2.5 text-slate-600" title={auth?.ultimoAcesso ? dataHora(auth.ultimoAcesso) : undefined}>
                    {auth ? tempoRelativo(auth.ultimoAcesso) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1" aria-label={modulos.map((m) => `${m.label}: ${m.nivel === 'editar' ? 'ver e editar' : m.nivel === 'ver' ? 'só ver' : 'sem acesso'}`).join('; ')}>
                      {modulos.map((m) => (
                        <span
                          key={m.chave}
                          title={`${m.label}: ${m.nivel === 'editar' ? 'ver e editar' : m.nivel === 'ver' ? 'só ver' : 'sem acesso'}`}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            m.nivel === 'editar' ? 'bg-blue-700 text-white' : m.nivel === 'ver' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          {rotuloCurto(m.chave)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{p.criadoEm ? fmt(new Date(p.criadoEm)) : '—'}</td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <IconButton title="Redefinir senha" onClick={() => setSenhaDe(p)}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        title={souEu ? 'Não é possível suspender a própria conta' : p.suspensa ? 'Reativar conta' : 'Suspender conta'}
                        disabled={souEu}
                        onClick={() => void acoes.alternarSuspensao(p.id, p.email, p.suspensa)}
                      >
                        {p.suspensa ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      </IconButton>
                      <IconButton title={souEu ? 'Não é possível excluir a própria conta' : 'Excluir conta'} tone="danger" disabled={souEu} onClick={() => void acoes.excluir(p.id, p.email)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Celular: cartões */}
      <ul className="flex flex-col gap-2 md:hidden">
        {!visiveis.length && <li className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Nenhuma conta com esses filtros.</li>}
        {visiveis.map(({ p, auth, status, modulos }) => (
          <li key={p.id}>
            <Link to={`/admin/usuarios/${p.id}`} className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-soft-sm">
              <Avatar email={p.email} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{p.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <SeloPapel admin={p.role === 'admin'} />
                  <SeloStatus status={status} />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Último acesso: {auth ? tempoRelativo(auth.ultimoAcesso) : '—'} · {modulos.filter((m) => m.nivel !== 'nenhum').length} de {MODULOS.length} módulos
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-xs text-slate-500">
        Legenda dos módulos: <span className="rounded bg-blue-700 px-1 font-bold text-white">azul</span> ver e editar ·{' '}
        <span className="rounded bg-blue-100 px-1 font-bold text-blue-800">claro</span> só ver · <span className="rounded bg-slate-100 px-1 text-slate-400 line-through">riscado</span> sem acesso.
        {contas && ' Último acesso vem do login no portal.'}
      </p>

      {senhaDe && <ModalResetarSenha usuario={senhaDe} onClose={() => setSenhaDe(null)} />}
    </>
  )
}
