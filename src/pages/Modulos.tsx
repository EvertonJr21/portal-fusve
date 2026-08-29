import { Link } from 'react-router-dom'

const MODULOS = [
  {
    to: '/ocs',
    titulo: 'Controle de OCs',
    descricao: 'Ordens de Compra, pendências, cobrança e fornecedores.',
    cor: 'border-l-status-blue',
  },
  {
    to: '/pareceres',
    titulo: 'Parecer Técnico',
    descricao: 'Marcas aprovadas, restritas e proibidas por produto.',
    cor: 'border-l-status-purple',
  },
  {
    to: '/contratos',
    titulo: 'Gestão de Contratos',
    descricao: 'Tabela mestre, alertas de vencimento e indicadores.',
    cor: 'border-l-status-green',
  },
]

export default function Modulos() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Portal FUSVE — Compras</h1>
        <p className="text-sm text-slate-500">Escolha um módulo para continuar</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {MODULOS.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className={`flex flex-col gap-2 rounded-lg border border-slate-200 border-l-4 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md ${m.cor}`}
          >
            <span className="text-base font-semibold text-slate-800">{m.titulo}</span>
            <span className="text-sm text-slate-500">{m.descricao}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
