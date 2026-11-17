import { AlertTriangle, History, LayoutDashboard, ShieldCheck, Users } from 'lucide-react'
import { useMemo } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useErrosApp } from '@/hooks/useHistorico'
import { useMeuPerfil, useTodosPerfis } from '@/hooks/usePermissoes'
import { RE_VERSAO } from '@/utils/admin'

/**
 * Casco da Administração (item 113), no padrão de áreas de admin como
 * GitHub/Vercel/Google Workspace: menu próprio à esquerda (abas no celular)
 * e uma página por assunto. A proteção real é a RLS; isto só evita mostrar
 * a área pra quem não é admin.
 */
const PAGINAS = [
  { to: '/admin', rotulo: 'Visão geral', icone: LayoutDashboard, exato: true },
  { to: '/admin/usuarios', rotulo: 'Usuários', icone: Users },
  { to: '/admin/permissoes', rotulo: 'Permissões', icone: ShieldCheck },
  { to: '/admin/atividade', rotulo: 'Atividade', icone: History },
  { to: '/admin/erros', rotulo: 'Erros', icone: AlertTriangle },
] as const

export function AdminLayout() {
  const { data: perfil, isLoading, error } = useMeuPerfil()
  const ehAdmin = perfil?.role === 'admin'
  const { data: perfis = [] } = useTodosPerfis()
  const { data: erros = [] } = useErrosApp(ehAdmin)
  const { pathname } = useLocation()
  const errosSemana = useMemo(() => {
    const semana = new Date().getTime() - 7 * 86_400_000
    return erros.filter((e) => new Date(e.criadoEm).getTime() >= semana && !RE_VERSAO.test(e.mensagem)).length
  }, [erros])

  if (isLoading) return <div className="p-6"><SkeletonRows /></div>
  if (error) return <p className="p-6 text-sm text-status-red">Erro ao carregar seu perfil: {error.message}</p>
  if (!ehAdmin) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-3 px-4 py-14 text-center">
        <h1 className="text-lg font-semibold text-slate-800">Área restrita</h1>
        <p className="text-sm text-slate-500">Essa página é só pra administradores do Portal FUSVE.</p>
        <Link to="/" className="text-sm text-blue-700 hover:underline">← Voltar para o início</Link>
      </div>
    )
  }

  const contagem = (to: string) => (to === '/admin/usuarios' ? perfis.length : to === '/admin/erros' ? errosSemana : 0)
  const ativa = (to: string, exato?: boolean) => (exato ? pathname === to : pathname === to || pathname.startsWith(`${to}/`))

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-56 shrink-0 flex-col border-r border-slate-200/80 bg-white md:flex">
        <div className="px-5 pb-4 pt-5">
          <h2 className="text-base font-bold tracking-tight text-slate-900">Administração</h2>
          <p className="text-xs leading-relaxed text-slate-500">Contas, acessos, atividade e saúde do portal</p>
        </div>
        <nav aria-label="Administração" className="flex flex-col gap-0.5 px-3">
          {PAGINAS.map((p) => {
            const Icone = p.icone
            const n = contagem(p.to)
            const on = ativa(p.to, 'exato' in p ? p.exato : false)
            return (
              <NavLink
                key={p.to}
                to={p.to}
                end={'exato' in p}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  on ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icone className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{p.rotulo}</span>
                {n > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[11px] font-semibold ${p.to === '/admin/erros' ? 'bg-status-red-bg text-status-red' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {n}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <nav aria-label="Administração" className="flex gap-1 overflow-x-auto border-b border-slate-200/80 bg-white px-3 py-2 md:hidden">
        {PAGINAS.map((p) => (
          <NavLink
            key={p.to}
            to={p.to}
            end={'exato' in p}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              ativa(p.to, 'exato' in p ? p.exato : false) ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {p.rotulo}
          </NavLink>
        ))}
      </nav>

      <div className="min-w-0 flex-1 px-3 py-5 md:px-8 md:py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
