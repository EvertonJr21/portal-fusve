import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AvisoMigracao, Avatar, CabecalhoAdmin } from '@/components/admin/AdminUi'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useAtividadeSistema, useAuditoria } from '@/hooks/useAdmin'
import type { AcaoAdmin } from '@/repositories/adminRepository'
import { detalheAuditoria, ROTULO_ACAO, tempoRelativo } from '@/utils/admin'
import { dataCurta } from '@/utils/carteiraContratos'
import { dataHora, descreverAlteracao } from '@/utils/historico'

/** Junta itens por dia ("Hoje", "Ontem", "12 nov 2026"). */
function porDia<T extends { em: string }>(itens: T[]): [string, T[]][] {
  const hoje = new Date()
  const chave = (iso: string) => {
    const d = new Date(iso)
    const dif = Math.round((new Date(hoje.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000)
    return dif === 0 ? 'Hoje' : dif === 1 ? 'Ontem' : dataCurta(d)
  }
  const m = new Map<string, T[]>()
  for (const i of itens) {
    const k = chave(i.em)
    m.set(k, [...(m.get(k) ?? []), i])
  }
  return [...m.entries()]
}

const ROTULO_TABELA: Record<string, string> = { ocs: 'OC', contratos: 'Contrato', contrato_produtos: 'Contrato' }
const linkRegistro = (tabela: string, id: string) => (tabela === 'ocs' ? `/ocs/ordens/${id}` : `/contratos/${id}`)

/** Atividade (item 113): ações de administração (registro de auditoria) e alterações feitas nos módulos. */
export default function Atividade() {
  const [params, setParams] = useSearchParams()
  const aba = params.get('aba') === 'modulos' ? 'modulos' : 'admin'
  const [busca, setBusca] = useState('')
  const [acao, setAcao] = useState<'' | AcaoAdmin>('')
  const [dias, setDias] = useState(30)
  const auditoria = useAuditoria()
  const sistema = useAtividadeSistema(dias)
  const termo = busca.trim().toLowerCase()

  const eventos = useMemo(
    () =>
      (auditoria.data ?? []).filter(
        (e) => (!acao || e.acao === acao) && (!termo || `${e.atorEmail} ${e.alvoEmail} ${detalheAuditoria(e.detalhe)}`.toLowerCase().includes(termo)),
      ),
    [auditoria.data, acao, termo],
  )
  const alteracoes = useMemo(
    () => (sistema.data ?? []).filter((a) => !termo || `${a.userEmail} ${a.registroId} ${a.campo} ${a.de} ${a.para}`.toLowerCase().includes(termo)),
    [sistema.data, termo],
  )

  return (
    <>
      <CabecalhoAdmin titulo="Atividade" descricao="Quem fez o quê: mudanças de acesso feitas por administradores e alterações registradas em OCs e contratos." />

      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label="Tipo de atividade" className="flex gap-1 border-b border-slate-200">
          {[
            ['admin', 'Administração'],
            ['modulos', 'Alterações nos módulos'],
          ].map(([v, r]) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={aba === v}
              onClick={() => setParams(v === 'admin' ? {} : { aba: v }, { replace: true })}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${aba === v ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative sm:w-72">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por pessoa ou registro" className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-2 text-sm" />
          </label>
          {aba === 'admin' ? (
            <select aria-label="Tipo de ação" value={acao} onChange={(e) => setAcao(e.target.value as typeof acao)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="">Todas as ações</option>
              {(Object.keys(ROTULO_ACAO) as AcaoAdmin[]).map((a) => (
                <option key={a} value={a}>{ROTULO_ACAO[a]}</option>
              ))}
            </select>
          ) : (
            <select aria-label="Período" value={dias} onChange={(e) => setDias(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
          )}
        </div>
      </div>

      {aba === 'admin' ? (
        auditoria.isLoading ? (
          <SkeletonRows />
        ) : auditoria.error ? (
          <AvisoMigracao />
        ) : !eventos.length ? (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Nenhuma ação de administração registrada{termo || acao ? ' com esses filtros' : ''}.</p>
        ) : (
          <Linhas grupos={porDia(eventos)} render={(e) => (
            <>
              <Avatar email={e.atorEmail || '?'} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{e.atorEmail || 'Sistema'}</span> · {ROTULO_ACAO[e.acao] ?? e.acao}
                  {e.alvoEmail && e.acao !== 'conta_criada' && (
                    <>
                      {' '}de{' '}
                      {e.alvoId ? <Link to={`/admin/usuarios/${e.alvoId}`} className="font-medium text-blue-700 hover:underline">{e.alvoEmail}</Link> : e.alvoEmail}
                    </>
                  )}
                </p>
                <p className="text-xs text-slate-500">{detalheAuditoria(e.detalhe)}</p>
              </div>
              <time dateTime={e.em} title={dataHora(e.em)} className="shrink-0 text-xs text-slate-400">{tempoRelativo(e.em)}</time>
            </>
          )} />
        )
      ) : sistema.isLoading ? (
        <SkeletonRows />
      ) : sistema.error ? (
        <p className="text-sm text-slate-500">Histórico de alterações indisponível: {sistema.error.message}</p>
      ) : !alteracoes.length ? (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Nenhuma alteração no período.</p>
      ) : (
        <>
          <Linhas grupos={porDia(alteracoes)} render={(a) => (
            <>
              <Avatar email={a.userEmail || '?'} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{a.userEmail || 'Sistema'}</span> ·{' '}
                  <Link to={linkRegistro(a.tabela, a.registroId)} className="font-medium text-blue-700 hover:underline">
                    {ROTULO_TABELA[a.tabela] ?? a.tabela} {a.tabela === 'ocs' ? a.registroId : ''}
                  </Link>
                </p>
                <p className="break-words text-xs text-slate-500">{descreverAlteracao({ id: a.id, campo: a.campo, de: a.de, para: a.para, userEmail: a.userEmail, em: a.em })}</p>
              </div>
              <time dateTime={a.em} title={dataHora(a.em)} className="shrink-0 text-xs text-slate-400">{tempoRelativo(a.em)}</time>
            </>
          )} />
          {(sistema.data?.length ?? 0) >= 1000 && <p className="text-xs text-slate-400">Mostrando as 1.000 alterações mais recentes do período.</p>}
        </>
      )}
    </>
  )
}

function Linhas<T extends { id: number; em: string }>({ grupos, render }: { grupos: [string, T[]][]; render: (i: T) => React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      {grupos.map(([dia, itens]) => (
        <section key={dia}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{dia}</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
            {itens.map((i) => (
              <li key={i.id} className="flex items-start gap-3 px-4 py-3">{render(i)}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
