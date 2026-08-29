import { Link } from 'react-router-dom'

const MODULOS = [
  {
    to: '/ocs',
    titulo: 'Controle de OCs',
    descricao: 'Ordens de Compra, pendências, cobrança e fornecedores.',
    icone: '📋',
    tone: 'blue',
  },
  {
    to: '/pareceres',
    titulo: 'Parecer Técnico',
    descricao: 'Marcas aprovadas, restritas e proibidas por produto.',
    icone: '🩺',
    tone: 'purple',
  },
  {
    to: '/contratos',
    titulo: 'Gestão de Contratos',
    descricao: 'Fornecedores, produtos, vigência e renovação.',
    icone: '📑',
    tone: 'green',
  },
] as const

const TONE_CLASS = {
  blue: {
    iconBg: 'bg-status-blue-bg text-status-blue',
    glow: 'hover:shadow-[0_16px_40px_-12px_rgba(30,64,175,0.35)]',
    ring: 'group-hover:ring-status-blue/20',
  },
  purple: {
    iconBg: 'bg-status-purple-bg text-status-purple',
    glow: 'hover:shadow-[0_16px_40px_-12px_rgba(109,40,217,0.35)]',
    ring: 'group-hover:ring-status-purple/20',
  },
  green: {
    iconBg: 'bg-status-green-bg text-status-green',
    glow: 'hover:shadow-[0_16px_40px_-12px_rgba(22,101,52,0.35)]',
    ring: 'group-hover:ring-status-green/20',
  },
} as const

export default function Modulos() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-14">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Portal FUSVE — Compras</h1>
        <p className="text-sm text-slate-500">Escolha um módulo para continuar</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {MODULOS.map((m, i) => {
          const t = TONE_CLASS[m.tone]
          return (
            <Link
              key={m.to}
              to={m.to}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`group relative flex animate-slide-up flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 opacity-0 shadow-soft-sm ring-1 ring-transparent transition-all duration-300 ease-out [animation-fill-mode:forwards] hover:-translate-y-1 ${t.glow} ${t.ring}`}
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${t.iconBg}`}>
                {m.icone}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold text-slate-800">{m.titulo}</span>
                <span className="text-sm leading-relaxed text-slate-500">{m.descricao}</span>
              </div>
              <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-slate-400 transition-all duration-200 group-hover:gap-2 group-hover:text-slate-600">
                Entrar <span aria-hidden>→</span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
