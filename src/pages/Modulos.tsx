import { ArrowRight, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ModuloNav } from '@/components/layout/navegacao'
import { HospitalSwitch } from '@/components/ui/HospitalSwitch'
import { EVENTO_ABRIR_PALETA } from '@/components/ui/PaletaComandos'
import { HOSPITAIS } from '@/constants'
import { useAuth } from '@/hooks/useAuth'
import { useHospital } from '@/hooks/useHospital'
import { useModulosVisiveis } from '@/hooks/useModulosVisiveis'
import { usePareceres } from '@/hooks/usePareceres'
import { useMeuPerfil } from '@/hooks/usePermissoes'
import { useResumoDia } from '@/hooks/useResumoDia'

function saudacao(hora: number) {
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
}

/** Primeiro nome do perfil; sem nome, a parte do e-mail antes do ponto (se for um nome, não um número). */
function primeiroNome(nome: string | undefined, email: string | undefined): string {
  const base = (nome?.trim() || email?.split('@')[0]?.split(/[._-]/)[0] || '').split(/\s+/)[0]
  if (!base || /\d/.test(base)) return ''
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase()
}

type Tom = 'alerta' | 'ok' | 'neutro'

const CLASSE_TOM: Record<Tom, string> = {
  alerta: 'bg-status-red-bg text-status-red',
  ok: 'bg-status-green-bg text-status-green',
  neutro: 'bg-slate-100 text-slate-600',
}

function CartaoModulo({ modulo, status }: { modulo: ModuloNav; status: { texto: string; tom: Tom } | null }) {
  const Icone = modulo.icone
  const paginas = modulo.grupos.flatMap((g) => g.paginas).filter((p) => p.to !== modulo.inicio)

  return (
    <article className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-soft-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-soft-lg">
      <Link to={modulo.inicio} className="flex items-start gap-4 p-5 pb-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${modulo.cor}`}>
          <Icone className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900">{modulo.titulo}</span>
            <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
          </span>
          <span className="text-sm text-slate-500">{modulo.descricao}</span>
          {status && (
            <span className={`mt-1 w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${CLASSE_TOM[status.tom]}`}>
              {status.texto}
            </span>
          )}
        </span>
      </Link>
      {paginas.length > 0 && (
        <nav aria-label={modulo.titulo} className="mt-auto flex flex-wrap gap-1.5 border-t border-slate-100 px-5 py-3">
          {paginas.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {p.rotulo}
            </Link>
          ))}
        </nav>
      )}
    </article>
  )
}

/**
 * Tela inicial (item 101): um menu para entrar nos módulos — saudação, busca,
 * hospital ativo e um cartão por módulo liberado, com um status curto e
 * atalhos para as páginas. Os avisos do dia ficam no sino de Avisos.
 */
export default function Modulos() {
  const { session } = useAuth()
  const { hospitalId } = useHospital()
  const { data: perfil } = useMeuPerfil()
  const { modulos, isAdmin, carregando, erro } = useModulosVisiveis()
  const { ocs, contratos, opmes, carregando: carregandoResumo } = useResumoDia()
  const temPareceres = modulos.some((m) => m.chave === 'pareceres')
  const { data: pareceres } = usePareceres()

  const nome = primeiroNome(perfil?.nome, session?.user.email)
  const agora = new Date()
  const dataBruta = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(agora)
  const dataLonga = dataBruta.charAt(0).toUpperCase() + dataBruta.slice(1)

  const status = (m: ModuloNav): { texto: string; tom: Tom } | null => {
    if (carregandoResumo && m.chave !== 'pareceres') return null
    switch (m.chave) {
      case 'ocs':
        if (!ocs) return null
        return ocs.precisaAcao
          ? { texto: `${ocs.precisaAcao} OC(s) pedem ação`, tom: 'alerta' }
          : { texto: `Tudo em dia · ${ocs.abertas} abertas`, tom: 'ok' }
      case 'contratos':
        if (!contratos) return null
        if (contratos.vencidos) return { texto: `${contratos.vencidos} vencido(s)`, tom: 'alerta' }
        if (contratos.em30) return { texto: `${contratos.em30} vence(m) em 30 dias`, tom: 'alerta' }
        return { texto: `${contratos.ativos} ativo(s)`, tom: 'neutro' }
      case 'opmes': {
        if (!opmes) return null
        const pend = opmes.proximos.length + opmes.atrasados.length
        return pend ? { texto: `${pend} pendente(s)`, tom: 'alerta' } : { texto: 'Nada pendente', tom: 'ok' }
      }
      case 'pareceres':
        return temPareceres && pareceres ? { texto: `${pareceres.length} parecer(es)`, tom: 'neutro' } : null
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-8 md:py-14">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-500">{dataLonga}</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {saudacao(agora.getHours())}
            {nome && `, ${nome}`}. Para onde vamos?
          </h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_PALETA))}
            className="flex h-12 w-full min-w-0 shrink-0 items-center gap-3 rounded-xl sm:w-auto sm:flex-1 border border-slate-200 bg-white px-4 text-left text-slate-400 shadow-soft-sm transition-colors hover:border-slate-300"
          >
            <Search className="h-5 w-5 shrink-0" />
            <span className="flex-1 truncate text-sm">Buscar OC, fornecedor, contrato, parecer…</span>
            <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[11px] sm:inline">Ctrl K</kbd>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 sm:hidden">Hospital</span>
            <span title={HOSPITAIS[hospitalId].nomeCompleto}>
              <HospitalSwitch />
            </span>
          </div>
        </div>
      </header>

      {erro && (
        <p className="text-sm text-status-red">
          Erro ao carregar suas permissões: {erro.message} — avise o administrador com essa mensagem.
        </p>
      )}
      {!carregando && !erro && modulos.length === 0 && (
        <p className="text-sm text-slate-400">Nenhum módulo liberado pra sua conta ainda. Fale com o administrador.</p>
      )}

      {modulos.length > 0 && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {modulos.map((m) => (
            <CartaoModulo key={m.chave} modulo={m} status={status(m)} />
          ))}
        </section>
      )}

      <footer className="flex flex-col gap-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>Os avisos do dia (entregas, cirurgias, vencimentos) ficam no sino de Avisos.</p>
        {isAdmin && (
          <Link to="/admin" className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-800">
            <ShieldCheck className="h-4 w-4" /> Administração
          </Link>
        )}
      </footer>
    </div>
  )
}
