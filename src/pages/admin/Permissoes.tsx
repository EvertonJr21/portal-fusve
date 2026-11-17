import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, CabecalhoAdmin, NivelAcessoControle } from '@/components/admin/AdminUi'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { MODULOS } from '@/constants'
import { useAcoesUsuario, type NivelAcesso } from '@/hooks/useAcoesUsuario'
import { useConfirm } from '@/hooks/useConfirm'
import { useTodasPermissoes, useTodosPerfis } from '@/hooks/usePermissoes'
import { rotuloCurto } from '@/utils/admin'

/**
 * Matriz de permissões (item 113): uma linha por conta, um controle de 3
 * posições por módulo (sem acesso / só ver / ver e editar), como a página
 * de papéis por recurso de consoles de admin. Admins têm acesso total.
 */
export default function Permissoes() {
  const { data: perfis = [], isLoading, error } = useTodosPerfis()
  const { isLoading: carregandoPerm } = useTodasPermissoes()
  const acoes = useAcoesUsuario()
  const confirmar = useConfirm()
  const [busca, setBusca] = useState('')

  if (isLoading || carregandoPerm) return <SkeletonRows />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar usuários: {error.message}</p>

  const termo = busca.trim().toLowerCase()
  const comuns = perfis.filter((p) => p.role !== 'admin' && (!termo || p.email.toLowerCase().includes(termo)))
  const admins = perfis.filter((p) => p.role === 'admin')

  const definirLinha = async (userId: string, email: string, nivel: NivelAcesso) => {
    const texto = nivel === 'editar' ? 'liberar ver e editar em todos os módulos' : nivel === 'ver' ? 'deixar só ver em todos os módulos' : 'bloquear todos os módulos'
    if (!(await confirmar({ message: `Para ${email}: ${texto}?`, tone: nivel === 'nenhum' ? 'danger' : 'default', confirmLabel: 'Aplicar' }))) return
    for (const m of MODULOS) await acoes.definirNivel(userId, m.chave, nivel)
  }

  return (
    <>
      <CabecalhoAdmin
        titulo="Permissões"
        descricao="O que cada conta pode fazer em cada módulo. Mesmo com acesso, um usuário comum só vê os próprios registros — só administradores veem os de todos."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative sm:w-72">
          <span className="sr-only">Buscar conta</span>
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar conta" className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-2 text-sm" />
        </label>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <div><dt className="inline font-semibold text-slate-700">Sem acesso:</dt> <dd className="inline">o módulo some do menu</dd></div>
          <div><dt className="inline font-semibold text-slate-700">Só ver:</dt> <dd className="inline">consulta, sem criar ou alterar</dd></div>
          <div><dt className="inline font-semibold text-slate-700">Editar:</dt> <dd className="inline">cria, altera e exclui</dd></div>
        </dl>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <caption className="sr-only">Permissões por conta e módulo</caption>
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2.5">Conta</th>
              {MODULOS.map((m) => (
                <th key={m.chave} scope="col" className="px-3 py-2.5">{rotuloCurto(m.chave)}</th>
              ))}
              <th scope="col" className="px-3 py-2.5 text-right">Todos os módulos</th>
            </tr>
          </thead>
          <tbody>
            {!comuns.length && (
              <tr>
                <td colSpan={MODULOS.length + 2} className="px-4 py-8 text-center text-slate-500">Nenhuma conta de usuário comum{termo ? ' com essa busca' : ''}.</td>
              </tr>
            )}
            {comuns.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <th scope="row" className="px-4 py-2.5 font-normal">
                  <div className="flex items-center gap-2.5">
                    <Avatar email={p.email} />
                    <div className="min-w-0">
                      <Link to={`/admin/usuarios/${p.id}`} className="block truncate font-medium text-slate-900 hover:text-blue-700 hover:underline">{p.email}</Link>
                      {p.suspensa && <span className="text-xs font-semibold text-status-red">Suspensa — sem login</span>}
                    </div>
                  </div>
                </th>
                {MODULOS.map((m) => (
                  <td key={m.chave} className="px-3 py-2.5">
                    <NivelAcessoControle
                      compacto
                      rotulo={`${rotuloCurto(m.chave)} — ${p.email}`}
                      valor={acoes.nivelDe(p.id, m.chave)}
                      onChange={(n) => void acoes.definirNivel(p.id, m.chave, n)}
                    />
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right">
                  <div className="flex justify-end gap-1 text-xs">
                    <button type="button" className="rounded-md px-2 py-1 font-medium text-blue-700 hover:bg-blue-50" onClick={() => void definirLinha(p.id, p.email, 'editar')}>Liberar tudo</button>
                    <button type="button" className="rounded-md px-2 py-1 font-medium text-status-red hover:bg-status-red-bg" onClick={() => void definirLinha(p.id, p.email, 'nenhum')}>Bloquear</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm">
        <h2 className="text-sm font-semibold text-slate-800">Administradores ({admins.length})</h2>
        <p className="mt-1 text-xs text-slate-500">Veem e editam tudo, de todos os usuários, sem depender das permissões acima. Para mudar o papel, abra a conta.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {admins.map((a) => (
            <li key={a.id}>
              <Link to={`/admin/usuarios/${a.id}`} className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-sm text-slate-700 hover:bg-slate-50">
                <Avatar email={a.email} /> {a.email}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
