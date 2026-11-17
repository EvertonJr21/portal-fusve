import { Database } from 'lucide-react'
import type { NivelAcesso } from '@/hooks/useAcoesUsuario'
import { STATUS_CONTA, type StatusConta } from '@/utils/admin'
import { iniciais } from '@/utils/usuario'

/** Peças visuais da Administração (item 113). */

const CORES_AVATAR = ['bg-blue-100 text-blue-800', 'bg-status-green-bg text-status-green', 'bg-status-purple-bg text-status-purple', 'bg-status-amber-bg text-status-amber']

export function Avatar({ email, tamanho = 'md' }: { email: string; tamanho?: 'md' | 'lg' }) {
  const cor = CORES_AVATAR[[...email].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES_AVATAR.length]
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${cor} ${tamanho === 'lg' ? 'h-12 w-12 text-base' : 'h-8 w-8 text-[11px]'}`}
    >
      {iniciais(email)}
    </span>
  )
}

export function SeloStatus({ status }: { status: StatusConta | null }) {
  if (!status) return <span className="text-xs text-slate-400">—</span>
  const s = STATUS_CONTA[status]
  return (
    <span title={s.descricao} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${s.tom}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.rotulo}
    </span>
  )
}

export function SeloPapel({ admin }: { admin: boolean }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${admin ? 'bg-status-purple-bg text-status-purple' : 'bg-slate-100 text-slate-600'}`}>
      {admin ? 'Admin' : 'Usuário'}
    </span>
  )
}

const NIVEIS: { valor: NivelAcesso; rotulo: string; curto: string }[] = [
  { valor: 'nenhum', rotulo: 'Sem acesso', curto: 'Não' },
  { valor: 'ver', rotulo: 'Só ver', curto: 'Ver' },
  { valor: 'editar', rotulo: 'Ver e editar', curto: 'Editar' },
]

/** Controle de 3 posições: sem acesso / só ver / ver e editar. */
export function NivelAcessoControle({ valor, onChange, rotulo, compacto = false, desabilitado = false }: {
  valor: NivelAcesso
  onChange: (n: NivelAcesso) => void
  rotulo: string
  compacto?: boolean
  desabilitado?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {NIVEIS.map((n) => {
        const ativo = valor === n.valor
        const cor = !ativo ? 'text-slate-500 hover:text-slate-800' : n.valor === 'editar' ? 'bg-blue-700 text-white shadow-soft-sm' : n.valor === 'ver' ? 'bg-white text-slate-800 shadow-soft-sm' : 'bg-white text-status-red shadow-soft-sm'
        return (
          <button
            key={n.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={desabilitado}
            title={n.rotulo}
            onClick={() => !ativo && onChange(n.valor)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${cor}`}
          >
            {compacto ? n.curto : n.rotulo}
          </button>
        )
      })}
    </div>
  )
}

/** Aviso quando a migration da Administração ainda não rodou (último acesso e histórico indisponíveis). */
export function AvisoMigracao() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-status-amber/30 bg-status-amber-bg p-3 text-sm text-status-amber">
      <Database className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Último acesso das contas e histórico de administração ficam disponíveis depois de rodar a migration{' '}
        <code className="rounded bg-white/60 px-1 text-xs">202611170001_administracao.sql</code> no SQL Editor do Supabase.
      </p>
    </div>
  )
}

export function CabecalhoAdmin({ titulo, descricao, acoes }: { titulo: string; descricao?: string; acoes?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{titulo}</h1>
        {descricao && <p className="mt-1 max-w-2xl text-sm text-slate-500">{descricao}</p>}
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap gap-2">{acoes}</div>}
    </div>
  )
}

