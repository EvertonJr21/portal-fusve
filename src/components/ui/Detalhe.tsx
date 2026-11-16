import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Peças das páginas de detalhe (contrato, OPME, OC, solicitação, parecer —
 * itens 102–105): seção em cartão, número-chave com ícone e campo rotulado.
 */

/** Mostra "—" quando não há valor. */
export function Valor({ children }: { children: ReactNode }) {
  const vazio = children === null || children === undefined || children === '' || children === false || children === '—'
  return vazio ? <span className="text-slate-300">—</span> : <>{children}</>
}

export function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{rotulo}</dt>
      <dd className="break-words text-sm text-slate-800">
        <Valor>{children}</Valor>
      </dd>
    </div>
  )
}

export function Secao({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{titulo}</h3>
        {acao}
      </div>
      {children}
    </section>
  )
}

export function Destaque({ icone, rotulo, valor, detalhe }: { icone: ReactNode; rotulo: string; valor: ReactNode; detalhe?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-soft-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icone}</span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{rotulo}</div>
        <div className="truncate text-sm font-semibold text-slate-800">
          <Valor>{valor}</Valor>
        </div>
        {detalhe && <div className="truncate text-xs text-slate-500">{detalhe}</div>}
      </div>
    </div>
  )
}

/** Mensagem de "não encontrado" com link de volta pra lista. */
export function NaoEncontrado({ texto, voltarPara, voltarRotulo }: { texto: string; voltarPara: string; voltarRotulo: string }) {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <p className="text-sm text-slate-600">{texto}</p>
      <Link to={voltarPara} className="text-sm font-medium text-blue-700 hover:underline">
        ← {voltarRotulo}
      </Link>
    </div>
  )
}
