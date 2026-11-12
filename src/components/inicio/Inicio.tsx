import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileSignature,
  Truck,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Prioridade } from '@/utils/prioridade'
import type { EntregaPrevista, OCPrioritaria, OpmePendente, ResumoContratos, ResumoOCs, ResumoOpmes } from '@/utils/resumoDia'
import { DIAS_ENTREGAS_PROXIMAS, DIAS_OPME_PROXIMOS, rotuloDia } from '@/utils/resumoDia'

/**
 * Peças da tela inicial (item 100). Referência: "home" de ferramentas de
 * trabalho diário (Linear, Stripe, Shopify, workspaces de compras do SAP/
 * ServiceNow) — uma pergunta só ("o que eu preciso fazer agora?"), números
 * clicáveis no topo, uma fila de prioridades e a agenda dos próximos dias;
 * módulos viram atalhos discretos.
 */

export type Tom = 'red' | 'amber' | 'blue' | 'green' | 'slate'

const COR_TOM: Record<Tom, string> = {
  red: 'text-status-red',
  amber: 'text-status-amber',
  blue: 'text-status-blue',
  green: 'text-status-green',
  slate: 'text-slate-700',
}
const FUNDO_TOM: Record<Tom, string> = {
  red: 'bg-status-red-bg text-status-red',
  amber: 'bg-status-amber-bg text-status-amber',
  blue: 'bg-status-blue-bg text-status-blue',
  green: 'bg-status-green-bg text-status-green',
  slate: 'bg-slate-100 text-slate-500',
}
const PONTO_PRIORIDADE: Record<Prioridade, string> = {
  critica: 'bg-status-red',
  alta: 'bg-status-amber',
  media: 'bg-status-blue',
  normal: 'bg-slate-300',
}

function prazoTexto(dias: number | null): { texto: string; tom: Tom } {
  if (dias === null) return { texto: '', tom: 'slate' }
  if (dias < 0) return { texto: `venceu há ${Math.abs(dias)}d`, tom: 'red' }
  if (dias === 0) return { texto: 'vence hoje', tom: 'amber' }
  return { texto: `vence em ${dias}d`, tom: dias <= 3 ? 'amber' : 'slate' }
}

// ─────────────────────────── Faixa de números ───────────────────────────

export interface Metrica {
  chave: string
  rotulo: string
  valor: number
  detalhe: string
  to: string
  icone: LucideIcon
  /** Tom quando o número é maior que zero (zero sempre fica verde/neutro). */
  tom: Tom
}

export function FaixaMetricas({ metricas, carregando }: { metricas: Metrica[]; carregando: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {metricas.map((m) => {
        const tom: Tom = m.valor > 0 ? m.tom : 'green'
        const Icone = m.icone
        return (
          <Link
            key={m.chave}
            to={m.to}
            className="group flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-soft-md"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">{m.rotulo}</span>
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${FUNDO_TOM[tom]}`}>
                <Icone className="h-4 w-4" />
              </span>
            </div>
            {carregando ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <span className={`text-3xl font-bold tabular-nums leading-none ${m.valor > 0 ? COR_TOM[tom] : 'text-slate-800'}`}>
                {m.valor}
              </span>
            )}
            <span className="truncate text-[11px] text-slate-400 group-hover:text-slate-500">{m.detalhe}</span>
          </Link>
        )
      })}
    </div>
  )
}

// ─────────────────────────── Cartão base ───────────────────────────

export function Cartao({
  titulo,
  icone: Icone,
  acao,
  children,
  className = '',
}: {
  titulo: string
  icone: LucideIcon
  acao?: { rotulo: string; to: string }
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-soft-sm ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Icone className="h-4 w-4 text-slate-400" />
          {titulo}
        </h2>
        {acao && (
          <Link to={acao.to} className="flex items-center gap-0.5 text-xs font-medium text-blue-700 hover:underline">
            {acao.rotulo} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  )
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 px-4 py-8 text-sm text-slate-400">
      <CheckCircle2 className="h-4 w-4 text-status-green" />
      {texto}
    </div>
  )
}

function Carregando() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  )
}

// ─────────────────────────── Prioridades (OCs) ───────────────────────────

const MAX_PRIORIDADES = 8

export function Prioridades({ ocs, carregando }: { ocs: ResumoOCs | null; carregando: boolean }) {
  const lista: OCPrioritaria[] = ocs?.prioritarias ?? []
  return (
    <Cartao
      titulo="Prioridades de hoje"
      icone={AlertTriangle}
      acao={ocs && ocs.precisaAcao > 0 ? { rotulo: `Ver todas (${ocs.precisaAcao})`, to: '/ocs/ordens?visao=acao' } : undefined}
    >
      {carregando && !ocs?.abertas ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <Vazio texto="Nenhuma OC pedindo ação agora." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {lista.slice(0, MAX_PRIORIDADES).map((p) => {
            const prazo = prazoTexto(p.diasPrazo)
            return (
              <li key={p.ocId}>
                <Link
                  to={`/ocs/ordens?visao=acao&q=${p.ocId}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${PONTO_PRIORIDADE[p.prioridade]}`} title={p.prioridade === 'critica' ? 'Crítica' : 'Alta'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-800">
                      <span className="font-semibold tabular-nums">OC {p.ocId}</span>
                      <span className="text-slate-400"> · </span>
                      {p.fornecedor}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{p.acao}</span>
                  </span>
                  {prazo.texto && <span className={`shrink-0 text-xs font-medium ${COR_TOM[prazo.tom]}`}>{prazo.texto}</span>}
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {lista.length > MAX_PRIORIDADES && (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          + {lista.length - MAX_PRIORIDADES} OC(s) com prioridade alta ou crítica
        </p>
      )}
    </Cartao>
  )
}

// ─────────────────────────── Agenda de entregas ───────────────────────────

export function AgendaEntregas({ entregas, carregando }: { entregas: EntregaPrevista[]; carregando: boolean }) {
  const hoje = new Date()
  const porDia = new Map<number, EntregaPrevista[]>()
  for (const e of entregas) porDia.set(e.dias, [...(porDia.get(e.dias) ?? []), e])
  const dias = [...porDia.keys()].sort((a, b) => a - b)

  return (
    <Cartao titulo={`Entregas previstas — próximos ${DIAS_ENTREGAS_PROXIMAS} dias`} icone={Truck} acao={{ rotulo: 'Abertas', to: '/ocs/ordens?visao=abertas' }}>
      {carregando && entregas.length === 0 ? (
        <Carregando />
      ) : dias.length === 0 ? (
        <Vazio texto="Nenhuma previsão de entrega registrada para os próximos dias." />
      ) : (
        <ol className="flex flex-col gap-3 p-4">
          {dias.map((d) => (
            <li key={d} className="grid grid-cols-[5.5rem_1fr] gap-3">
              <span className={`pt-1 text-xs font-semibold ${d === 0 ? 'text-status-amber' : d === 1 ? 'text-status-blue' : 'text-slate-500'}`}>
                {rotuloDia(d, hoje)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {porDia.get(d)!.map((e) => (
                  <Link
                    key={e.ocId}
                    to={`/ocs/ordens?visao=todas&q=${e.ocId}`}
                    className="max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-white"
                    title={e.fornecedor}
                  >
                    <span className="font-semibold tabular-nums">OC {e.ocId}</span>
                    <span className="text-slate-400"> · {e.fornecedor}</span>
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Cartao>
  )
}

// ─────────────────────────── OPME ───────────────────────────

export function AgendaOpme({
  opmes,
  nomeFornecedor,
  carregando,
}: {
  opmes: ResumoOpmes
  nomeFornecedor: (id: number | null) => string
  carregando: boolean
}) {
  const itens: OpmePendente[] = [...opmes.atrasados, ...opmes.proximos]
  return (
    <Cartao titulo="Cirurgias com OPME pendente" icone={CalendarDays} acao={{ rotulo: 'Calendário', to: '/opmes' }}>
      {carregando && itens.length === 0 ? (
        <Carregando />
      ) : itens.length === 0 ? (
        <Vazio texto={`Nenhum OPME pendente nos próximos ${DIAS_OPME_PROXIMOS} dias.`} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {itens.slice(0, 6).map((o) => {
            const tom: Tom = o.dias < 0 ? 'red' : o.dias <= 1 ? 'red' : 'amber'
            return (
              <li key={o.id}>
                <Link to={`/opmes/gestao?q=${encodeURIComponent(o.paciente)}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <span className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-bold leading-tight ${FUNDO_TOM[tom]}`}>
                    <span>{o.data.slice(0, 2)}</span>
                    <span className="font-medium">{o.data.slice(3, 5)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{o.paciente}</span>
                    <span className="block truncate text-xs text-slate-500">{nomeFornecedor(o.fornecedorId) || 'Sem fornecedor'}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-medium ${COR_TOM[tom]}`}>
                    {o.dias < 0 ? 'já passou' : o.dias === 0 ? 'hoje' : o.dias === 1 ? 'amanhã' : `em ${o.dias}d`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Cartao>
  )
}

// ─────────────────────────── Contratos ───────────────────────────

export function ContratosVencendo({ contratos, carregando }: { contratos: ResumoContratos; carregando: boolean }) {
  return (
    <Cartao titulo="Contratos a vencer" icone={FileSignature} acao={{ rotulo: 'Tabela mestre', to: '/contratos' }}>
      {carregando && contratos.ativos === 0 ? (
        <Carregando />
      ) : contratos.lista.length === 0 ? (
        <Vazio texto={`${contratos.ativos} ativo(s), nenhum vence em 90 dias.`} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {contratos.lista.slice(0, 5).map((c) => {
            const tom: Tom = c.dias < 0 ? 'red' : c.dias <= 30 ? 'amber' : 'slate'
            return (
              <li key={c.id}>
                <Link
                  to={`/contratos?vigencia=${c.dias < 0 ? 'vencido' : 'vencendo'}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50"
                >
                  <span className="min-w-0 truncate text-sm text-slate-700">{c.nome}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${FUNDO_TOM[tom]}`}>
                    {c.dias < 0 ? `vencido há ${Math.abs(c.dias)}d` : c.dias === 0 ? 'vence hoje' : `${c.dias}d`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Cartao>
  )
}

// ─────────────────────────── Dados a conferir ───────────────────────────

/** Pendência de cadastro, não de operação: fica discreta, longe dos alertas. */
export function DadosAConferir({ aConfirmar }: { aConfirmar: number }) {
  if (aConfirmar === 0) return null
  return (
    <Link
      to="/ocs/importar"
      className="flex items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm transition-colors hover:border-slate-400 hover:bg-white"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Clock className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-slate-700">
          {aConfirmar.toLocaleString('pt-BR')} entrega(s) sem data confirmada
        </span>
        <span className="block text-xs text-slate-500">
          OCs concluídas com a data estimada no dia da importação. Importe o Acompanhamento de Compras para usar a data real
          de entrada no OTIF.
        </span>
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-700">
          <Upload className="h-3.5 w-3.5" /> Importar Acompanhamento
        </span>
      </span>
    </Link>
  )
}

