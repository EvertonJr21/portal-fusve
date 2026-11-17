import { AlertTriangle, ArrowRight, Info, ShieldAlert } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AvisoMigracao, Avatar, CabecalhoAdmin } from '@/components/admin/AdminUi'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { MODULOS } from '@/constants'
import { useAtividadeSistema, useAuditoria, useContasAuth } from '@/hooks/useAdmin'
import { useErrosApp } from '@/hooks/useHistorico'
import { useTodasPermissoes, useTodosPerfis } from '@/hooks/usePermissoes'
import { detalheAuditoria, atividadePorUsuario, resumoAdmin, ROTULO_ACAO, tempoRelativo } from '@/utils/admin'

/** Visão geral da Administração (item 113): números, pontos de atenção e o que aconteceu por último. */
export default function VisaoGeral() {
  const { data: perfis = [], isLoading, error } = useTodosPerfis()
  const { data: permissoes = [] } = useTodasPermissoes()
  const { data: contas, error: erroContas } = useContasAuth()
  const { data: erros = [] } = useErrosApp(true)
  const { data: auditoria = [], error: erroAuditoria } = useAuditoria()
  const { data: alteracoes = [] } = useAtividadeSistema(30)

  const r = useMemo(() => resumoAdmin(perfis, contas, permissoes, erros, MODULOS.length), [perfis, contas, permissoes, erros])
  const quemUsa = useMemo(() => atividadePorUsuario(alteracoes).slice(0, 6), [alteracoes])
  const maxUso = Math.max(1, ...quemUsa.map((q) => q.total))

  if (isLoading) return <SkeletonRows />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar usuários: {error.message}</p>

  const numeros: { rotulo: string; valor: number | null; detalhe: string; para: string; tom?: string }[] = [
    { rotulo: 'Contas', valor: r.contas, detalhe: `${r.admins} admin${r.admins === 1 ? '' : 's'}`, para: '/admin/usuarios' },
    { rotulo: 'Ativas', valor: r.ativas, detalhe: 'entraram em 30 dias', para: '/admin/usuarios?status=ativa' },
    { rotulo: 'Inativas', valor: r.inativas, detalhe: 'mais de 30 dias sem entrar', para: '/admin/usuarios?status=inativa', tom: r.inativas ? 'text-status-amber' : undefined },
    { rotulo: 'Suspensas', valor: r.suspensas, detalhe: 'login bloqueado', para: '/admin/usuarios?status=suspensa' },
    { rotulo: 'Erros em 7 dias', valor: r.errosSemana, detalhe: 'telas que quebraram', para: '/admin/erros', tom: r.errosSemana ? 'text-status-red' : undefined },
  ]

  const acessoModulo = MODULOS.map((m) => {
    const comuns = perfis.filter((p) => p.role !== 'admin' && !p.suspensa)
    const editam = comuns.filter((p) => permissoes.some((x) => x.userId === p.id && x.modulo === m.chave && x.podeEditar)).length
    const veem = comuns.filter((p) => permissoes.some((x) => x.userId === p.id && x.modulo === m.chave && x.podeVer)).length - editam
    return { ...m, editam, veem, sem: comuns.length - editam - veem }
  })

  return (
    <>
      <CabecalhoAdmin titulo="Visão geral" descricao="O estado das contas e do portal hoje, e o que precisa da sua atenção." />
      {(erroContas || erroAuditoria) && <AvisoMigracao />}

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {numeros.map((n) => (
          <Link key={n.rotulo} to={n.para} className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm transition-colors hover:border-slate-300">
            <dt className="text-xs text-slate-500">{n.rotulo}</dt>
            <dd className={`mt-1 text-2xl font-bold tabular-nums ${n.tom ?? 'text-slate-900'}`}>{n.valor ?? '—'}</dd>
            <dd className="text-xs text-slate-500">{n.detalhe}</dd>
          </Link>
        ))}
      </dl>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm md:p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Pontos de atenção</h2>
        {r.alertas.length ? (
          <ul className="flex flex-col gap-2">
            {r.alertas.map((a) => {
              const Icone = a.nivel === 'alto' ? AlertTriangle : a.nivel === 'medio' ? ShieldAlert : Info
              const cor = a.nivel === 'alto' ? 'text-status-red bg-status-red-bg' : a.nivel === 'medio' ? 'text-status-amber bg-status-amber-bg' : 'text-status-blue bg-status-blue-bg'
              return (
                <li key={a.texto} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cor}`}>
                    <Icone className="h-4 w-4" />
                  </span>
                  <p className="flex-1 text-sm text-slate-700">{a.texto}</p>
                  {a.link && (
                    <Link to={a.link.para} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-700 hover:underline">
                      {a.link.rotulo} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nada pendente. Contas, permissões e telas estão em ordem.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Últimas ações de administração</h2>
            <Link to="/admin/atividade" className="text-xs font-medium text-blue-700 hover:underline">Ver tudo</Link>
          </div>
          {auditoria.length ? (
            <ul className="divide-y divide-slate-100">
              {auditoria.slice(0, 7).map((e) => (
                <li key={e.id} className="flex items-start gap-3 py-2.5">
                  <Avatar email={e.atorEmail || '?'} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="text-slate-700">
                      <span className="font-medium text-slate-900">{ROTULO_ACAO[e.acao] ?? e.acao}</span>
                      {e.alvoEmail && <> · {e.alvoEmail}</>}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {detalheAuditoria(e.detalhe)} · {e.atorEmail || 'sistema'} · {tempoRelativo(e.em)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{erroAuditoria ? 'Disponível depois da migration.' : 'Nenhuma ação registrada ainda.'}</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Quem está usando (últimos 30 dias)</h2>
            <Link to="/admin/atividade?aba=modulos" className="text-xs font-medium text-blue-700 hover:underline">Ver alterações</Link>
          </div>
          {quemUsa.length ? (
            <ul className="flex flex-col gap-3" role="img" aria-label={`Alterações por pessoa: ${quemUsa.map((q) => `${q.email} ${q.total}`).join(', ')}`}>
              {quemUsa.map((q) => (
                <li key={q.email}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="truncate text-slate-700">{q.email}</span>
                    <span className="shrink-0 tabular-nums text-slate-500">{q.total} {q.total === 1 ? 'alteração' : 'alterações'} · {tempoRelativo(q.ultima)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-700" style={{ width: `${(q.total / maxUso) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma alteração em OCs ou contratos nos últimos 30 dias.</p>
          )}
          <p className="mt-3 text-xs text-slate-400">Conta as alterações registradas automaticamente em OCs e contratos.</p>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Acesso por módulo</h2>
          <Link to="/admin/permissoes" className="text-xs font-medium text-blue-700 hover:underline">Ajustar permissões</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {acessoModulo.map((m) => {
            const total = Math.max(1, m.editam + m.veem + m.sem)
            return (
              <div key={m.chave} className="rounded-lg border border-slate-100 p-3">
                <p className="text-sm font-medium text-slate-800">{m.label}</p>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${m.editam} editam, ${m.veem} só veem, ${m.sem} sem acesso`}>
                  <div className="bg-blue-700" style={{ width: `${(m.editam / total) * 100}%` }} />
                  <div className="bg-blue-300" style={{ width: `${(m.veem / total) * 100}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {m.editam} editam · {m.veem} só veem · {m.sem} sem acesso
                </p>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">Administradores acessam tudo e não entram nessa conta.</p>
      </section>
    </>
  )
}
