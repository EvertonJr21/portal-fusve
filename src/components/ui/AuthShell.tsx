import type { ReactNode } from 'react'

const MODULOS = [
  { icone: '📋', label: 'Controle de OCs' },
  { icone: '🩺', label: 'Parecer Técnico' },
  { icone: '📑', label: 'Gestão de Contratos' },
  { icone: '🗓️', label: 'Controle de OPME' },
] as const

/**
 * Casco compartilhado das telas de autenticação (Login/DefinirSenha) —
 * redesign de 22/09/2026, pedido do Everton ("essa parte de login nosso
 * está meio chula") — antes cada uma era só um card centralizado solto em
 * fundo cinza. Inspirado no padrão comum de apps SaaS atuais (split-screen:
 * painel de marca à esquerda, formulário à direita) — a marca usa o token
 * institucional `--color-huv` (não hardcoded, já existia em `index.css`).
 * Painel esquerdo só aparece em telas ≥ md, mobile vê só o formulário —
 * regra 9 do CLAUDE.md, responsivo desde o início.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <div className="relative hidden w-[42%] shrink-0 flex-col justify-between overflow-hidden bg-huv p-10 text-white md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5 blur-3xl"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold backdrop-blur-sm">
            FV
          </span>
          <span className="text-sm font-semibold tracking-wide">Portal FUSVE</span>
        </div>

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold leading-snug">
              Gestão de compras hospitalares, num só lugar.
            </h2>
            <p className="text-sm leading-relaxed text-white/70">
              Ordens de Compra, Pareceres Técnicos, Contratos e OPME — HUV e HMK,
              financiado 100% SUS.
            </p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {MODULOS.map((m) => (
              <li key={m.label} className="flex items-center gap-2.5 text-sm text-white/85">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-xs">
                  {m.icone}
                </span>
                {m.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          Fundação Educacional Severino Sombra — Setor de Compras
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-sm animate-slide-up [animation-fill-mode:backwards]">
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-huv text-sm font-bold text-white">
              FV
            </span>
            <span className="text-sm font-semibold tracking-wide text-slate-800">Portal FUSVE</span>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-soft-lg">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10'

/** Input com ícone à esquerda — mesmo visual nos dois campos (e-mail/senha) das telas de auth. */
export function AuthInput({
  icon,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        {icon}
      </span>
      <input className={`${inputBase} ${className}`} {...props} />
    </div>
  )
}

export function IconMail() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.5l9 6 9-6M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
    </svg>
  )
}

export function IconLock() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path strokeLinecap="round" d="M8 10.5V7a4 4 0 018 0v3.5" />
    </svg>
  )
}
