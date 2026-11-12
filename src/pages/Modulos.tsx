import { Link } from 'react-router-dom'
import { AlertTriangle, BarChart3, CalendarClock, CalendarDays, ChevronRight, FileSignature, Search, Truck, Upload } from 'lucide-react'
import {
  AgendaEntregas,
  AgendaOpme,
  ContratosVencendo,
  DadosAConferir,
  FaixaMetricas,
  Prioridades,
  type Metrica,
} from '@/components/inicio/Inicio'
import { ICONE_MODULO } from '@/components/ui/iconesModulo'
import { EVENTO_ABRIR_PALETA } from '@/components/ui/PaletaComandos'
import { HOSPITAIS, type ModuloChave } from '@/constants'
import { useAuth } from '@/hooks/useAuth'
import { useHospital } from '@/hooks/useHospital'
import { useMeuPerfil, useMinhasPermissoes } from '@/hooks/usePermissoes'
import { useResumoDia } from '@/hooks/useResumoDia'
import { DIAS_ENTREGAS_PROXIMAS, DIAS_OPME_PROXIMOS } from '@/utils/resumoDia'

const MODULOS = [
  { to: '/ocs/ordens', chave: 'ocs' as ModuloChave, titulo: 'Ordens de Compra', descricao: 'OCs, cobrança e fornecedores' },
  { to: '/pareceres', chave: 'pareceres' as ModuloChave, titulo: 'Parecer Técnico', descricao: 'Marcas por produto' },
  { to: '/contratos', chave: 'contratos' as ModuloChave, titulo: 'Contratos', descricao: 'Vigência, produtos e comodatos' },
  { to: '/opmes', chave: 'opmes' as ModuloChave, titulo: 'OPME', descricao: 'Calendário de cirurgias' },
] as const

const COR_MODULO: Record<ModuloChave, string> = {
  ocs: 'bg-status-blue-bg text-status-blue',
  pareceres: 'bg-status-purple-bg text-status-purple',
  contratos: 'bg-status-green-bg text-status-green',
  opmes: 'bg-status-amber-bg text-status-amber',
}

function saudacao(hora: number) {
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
}

/** Primeiro nome do perfil; sem nome, a parte do e-mail antes do ponto (se for um nome, não um número). */
function primeiroNome(nome: string | undefined, email: string | undefined): string {
  const base = (nome?.trim() || email?.split('@')[0]?.split(/[._-]/)[0] || '').split(/\s+/)[0]
  if (!base || /\d/.test(base)) return ''
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase()
}

/**
 * Tela inicial (item 100) — responde "o que eu preciso fazer agora?" no
 * hospital ativo: saudação e atalhos, números clicáveis, a fila de
 * prioridades, a agenda de entregas e as cirurgias com OPME pendente.
 * Os módulos viram atalhos discretos na coluna da direita.
 */
export default function Modulos() {
  const { session } = useAuth()
  const { hospitalId } = useHospital()
  const { data: perfil, isLoading: carregandoPerfil, error: erroPerfil } = useMeuPerfil()
  const { data: permissoes, isLoading: carregandoPermissoes, error: erroPermissoes } = useMinhasPermissoes()
  const resumo = useResumoDia()
  const isAdmin = perfil?.role === 'admin'
  const carregandoPerm = carregandoPerfil || carregandoPermissoes
  const erroPerm = erroPerfil ?? erroPermissoes

  const modulosVisiveis = carregandoPerm || erroPerm
    ? []
    : MODULOS.filter((m) => isAdmin || permissoes?.some((p) => p.modulo === m.chave && p.podeVer))

  const agora = new Date()
  const nome = primeiroNome(perfil?.nome, session?.user.email)
  const dataBruta = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(agora)
  const dataLonga = dataBruta.charAt(0).toUpperCase() + dataBruta.slice(1)
  const { ocs, contratos, opmes, carregando } = resumo

  const metricas: Metrica[] = []
  if (ocs) {
    metricas.push(
      {
        chave: 'acao',
        rotulo: 'Precisam de ação',
        valor: ocs.precisaAcao,
        detalhe: ocs.criticas ? `${ocs.criticas} crítica(s) · de ${ocs.abertas} abertas` : `de ${ocs.abertas} OCs abertas`,
        to: '/ocs/ordens?visao=acao',
        icone: AlertTriangle,
        tom: ocs.criticas ? 'red' : 'amber',
      },
      {
        chave: 'vencidas',
        rotulo: 'Além do prazo',
        valor: ocs.vencidas,
        detalhe: ocs.previsaoDescumprida ? `${ocs.previsaoDescumprida} com previsão descumprida` : 'data prometida já passou',
        to: '/ocs/ordens?visao=vencidas',
        icone: CalendarClock,
        tom: 'red',
      },
      {
        chave: 'entregas',
        rotulo: `Entregas em ${DIAS_ENTREGAS_PROXIMAS} dias`,
        valor: ocs.proximasEntregas.length,
        detalhe: `${ocs.entregas.filter((e) => e.dias === 0).length} hoje · ${ocs.semPrevisao} sem previsão`,
        to: '/ocs/ordens?visao=abertas',
        icone: Truck,
        tom: 'blue',
      },
    )
  }
  if (opmes) {
    metricas.push({
      chave: 'opme',
      rotulo: 'OPME pendente',
      valor: opmes.proximos.length + opmes.atrasados.length,
      detalhe: opmes.atrasados.length ? `${opmes.atrasados.length} com cirurgia já passada` : `próximos ${DIAS_OPME_PROXIMOS} dias`,
      to: '/opmes/gestao',
      icone: CalendarDays,
      tom: opmes.atrasados.length || opmes.proximos.some((o) => o.dias <= 1) ? 'red' : 'amber',
    })
  }
  if (contratos) {
    metricas.push({
      chave: 'contratos',
      rotulo: 'Contratos a vencer',
      valor: contratos.vencidos + contratos.em30 + contratos.em90,
      detalhe: contratos.vencidos ? `${contratos.vencidos} já vencido(s)` : `em 90 dias · ${contratos.ativos} ativos`,
      to: '/contratos?vigencia=vencendo',
      icone: FileSignature,
      tom: contratos.vencidos ? 'red' : contratos.em30 ? 'amber' : 'blue',
    })
  }

  const nomeFornecedor = (id: number | null) => (id ? (resumo.forns.find((f) => f.id === id)?.nome ?? '') : '')

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-500">
            {dataLonga} · <span className="font-medium text-slate-600">{HOSPITAIS[hospitalId].nomeCompleto}</span>
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {saudacao(agora.getHours())}
            {nome && `, ${nome}`}
          </h1>
          {ocs && !carregando && (
            <p className="text-sm text-slate-500">
              {ocs.precisaAcao === 0
                ? 'Nenhuma OC pedindo ação agora.'
                : `${ocs.precisaAcao} OC(s) pedem sua atenção${ocs.entregas.length ? ` e ${ocs.entregas.length} entrega(s) estão previstas para hoje ou amanhã` : ''}.`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_PALETA))}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-soft-sm hover:border-slate-300"
          >
            <Search className="h-4 w-4" /> Buscar
            <kbd className="hidden rounded border border-slate-200 px-1 font-mono text-[10px] text-slate-400 sm:inline">Ctrl K</kbd>
          </button>
          {ocs && (
            <>
              <Link
                to="/ocs/importar"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-soft-sm hover:border-slate-300"
              >
                <Upload className="h-4 w-4" /> Importar relatórios
              </Link>
              <Link
                to="/ocs/ordens"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white shadow-soft-sm hover:bg-blue-800"
              >
                Abrir OCs <ChevronRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </header>

      {erroPerm && (
        <p className="text-sm text-status-red">
          Erro ao carregar suas permissões: {erroPerm.message} — avise o administrador com essa mensagem.
        </p>
      )}
      {!carregandoPerm && !erroPerm && modulosVisiveis.length === 0 && (
        <p className="text-sm text-slate-400">Nenhum módulo liberado pra sua conta ainda. Fale com o administrador.</p>
      )}
      {resumo.erro && <p className="text-sm text-status-red">Não foi possível carregar o resumo: {resumo.erro.message}</p>}

      {metricas.length > 0 && <FaixaMetricas metricas={metricas} carregando={carregando} />}

      {modulosVisiveis.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
            {ocs && <Prioridades ocs={ocs} carregando={carregando} />}
            {ocs && <AgendaEntregas entregas={ocs.proximasEntregas} carregando={carregando} />}
            {!ocs && opmes && <AgendaOpme opmes={opmes} nomeFornecedor={nomeFornecedor} carregando={carregando} />}
          </div>

          <aside className="flex min-w-0 flex-col gap-6">
            {ocs && opmes && <AgendaOpme opmes={opmes} nomeFornecedor={nomeFornecedor} carregando={carregando} />}
            {contratos && <ContratosVencendo contratos={contratos} carregando={carregando} />}

            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Módulos</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {modulosVisiveis.map((m) => {
                  const Icone = ICONE_MODULO[m.chave]
                  return (
                    <Link
                      key={m.to}
                      to={m.to}
                      className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-soft-sm transition-colors hover:border-slate-300"
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${COR_MODULO[m.chave]}`}>
                        <Icone className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">{m.titulo}</span>
                        <span className="block truncate text-xs text-slate-500">{m.descricao}</span>
                      </span>
                      <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 sm:block" />
                    </Link>
                  )
                })}
                {ocs && (
                  <Link
                    to="/ocs/metricas"
                    className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-soft-sm transition-colors hover:border-slate-300"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <BarChart3 className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">Desempenho de entrega</span>
                      <span className="block truncate text-xs text-slate-500">OTIF, lead time e notas</span>
                    </span>
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 sm:block" />
                  </Link>
                )}
              </div>
            </section>

            {ocs && <DadosAConferir aConfirmar={ocs.aConfirmar} />}
          </aside>
        </div>
      )}
    </div>
  )
}
