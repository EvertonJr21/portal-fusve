import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HOSPITAIS } from '@/constants'
import { useHospital } from '@/hooks/useHospital'
import { useResumoDia } from '@/hooks/useResumoDia'
import { DIAS_OPME_PROXIMOS } from '@/utils/resumoDia'

type Tom = 'red' | 'amber' | 'blue' | 'green' | 'slate'

const TOM_NUMERO: Record<Tom, string> = {
  red: 'text-status-red',
  amber: 'text-status-amber',
  blue: 'text-status-blue',
  green: 'text-status-green',
  slate: 'text-slate-700',
}

const quando = (dias: number) => (dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : dias < 0 ? `há ${Math.abs(dias)}d` : `em ${dias}d`)

/**
 * "Hoje" — o que pede atenção no hospital ativo, sem precisar entrar em cada
 * módulo. Cada número abre a lista correspondente. Só mostra os módulos que a
 * conta pode ver.
 */
export function ResumoDoDia() {
  const { hospitalId } = useHospital()
  const { ocs, contratos, opmes, forns, carregando, erro } = useResumoDia()
  if (!ocs && !contratos && !opmes) return null

  const nomeForn = (id: number | null) => (id ? (forns.find((f) => f.id === id)?.nome ?? '') : '')

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Hoje — {HOSPITAIS[hospitalId].sigla}</h2>
        {carregando && <span className="text-xs text-slate-400">atualizando…</span>}
      </div>
      {erro && <p className="text-sm text-status-red">Não foi possível carregar o resumo: {erro.message}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {ocs && (
          <Painel titulo="Ordens de Compra" to="/ocs/ordens" rodape={`${ocs.abertas} OC(s) abertas`}>
            <div className="grid grid-cols-2 gap-2">
              <Numero valor={ocs.precisaAcao} rotulo="Precisam de ação" tom={ocs.precisaAcao ? 'amber' : 'green'} to="/ocs/ordens?visao=acao" />
              <Numero valor={ocs.vencidas} rotulo="Vencidas" tom={ocs.vencidas ? 'red' : 'green'} to="/ocs/ordens?visao=vencidas" />
              <Numero valor={ocs.semPrevisao} rotulo="Sem previsão" tom={ocs.semPrevisao ? 'amber' : 'green'} to="/ocs/ordens?visao=sem_previsao" />
              <Numero valor={ocs.aConfirmar} rotulo="Entrega a confirmar" tom="slate" to="/ocs/ordens?visao=a_confirmar" />
            </div>
            <Lista
              titulo="Entregas previstas hoje e amanhã"
              vazio="Nenhuma entrega prevista para hoje ou amanhã."
              itens={ocs.entregas.map((e) => ({
                chave: String(e.ocId),
                to: `/ocs/ordens?visao=acao&q=${e.ocId}`,
                principal: `OC ${e.ocId}`,
                secundario: e.fornecedor,
                selo: quando(e.dias),
                tom: e.dias === 0 ? ('amber' as const) : ('blue' as const),
              }))}
            />
          </Painel>
        )}

        {contratos && (
          <Painel titulo="Contratos" to="/contratos" rodape={`${contratos.ativos} contrato(s) ativo(s)`}>
            <div className="grid grid-cols-3 gap-2">
              <Numero valor={contratos.vencidos} rotulo="Vencidos" tom={contratos.vencidos ? 'red' : 'green'} to="/contratos?vigencia=vencido" />
              <Numero valor={contratos.em30} rotulo="Vencem em 30d" tom={contratos.em30 ? 'amber' : 'green'} to="/contratos?vigencia=vencendo" />
              <Numero valor={contratos.em90} rotulo="Em 31–90d" tom="slate" to="/contratos?vigencia=vencendo" />
            </div>
            <Lista
              titulo="Mais próximos do vencimento"
              vazio="Nenhum contrato ativo vencendo nos próximos 90 dias."
              itens={contratos.lista.map((c) => ({
                chave: c.id,
                to: `/contratos?vigencia=${c.dias < 0 ? 'vencido' : 'vencendo'}`,
                principal: c.nome,
                secundario: '',
                selo: c.dias < 0 ? `vencido ${quando(c.dias)}` : quando(c.dias),
                tom: c.dias < 0 ? ('red' as const) : c.dias <= 30 ? ('amber' as const) : ('slate' as const),
              }))}
            />
          </Painel>
        )}

        {opmes && (
          <Painel titulo="OPME" to="/opmes" rodape="Cirurgias com OPME ainda pendente">
            <div className="grid grid-cols-2 gap-2">
              <Numero
                valor={opmes.proximos.length}
                rotulo={`Pendentes em ${DIAS_OPME_PROXIMOS} dias`}
                tom={opmes.proximos.length ? 'amber' : 'green'}
                to="/opmes/gestao"
              />
              <Numero valor={opmes.atrasados.length} rotulo="Cirurgia já passou" tom={opmes.atrasados.length ? 'red' : 'green'} to="/opmes/gestao" />
            </div>
            <Lista
              titulo="Próximas cirurgias"
              vazio={`Nenhum OPME pendente nos próximos ${DIAS_OPME_PROXIMOS} dias.`}
              itens={opmes.proximos.map((o) => ({
                chave: o.id,
                to: '/opmes/gestao',
                principal: o.paciente,
                secundario: [o.data, nomeForn(o.fornecedorId)].filter(Boolean).join(' · '),
                selo: quando(o.dias),
                tom: o.dias <= 1 ? ('red' as const) : ('amber' as const),
              }))}
            />
          </Painel>
        )}
      </div>
    </section>
  )
}

function Painel({ titulo, to, rodape, children }: { titulo: string; to: string; rodape: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{titulo}</h3>
        <Link to={to} className="text-xs font-medium text-blue-700 hover:underline">
          Abrir →
        </Link>
      </div>
      {children}
      <p className="mt-auto text-[11px] text-slate-400">{rodape}</p>
    </div>
  )
}

function Numero({ valor, rotulo, tom, to }: { valor: number; rotulo: string; tom: Tom; to: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 transition-colors hover:border-slate-300 hover:bg-white"
    >
      <span className={`text-2xl font-bold tabular-nums leading-tight ${TOM_NUMERO[tom]}`}>{valor}</span>
      <span className="text-[11px] leading-tight text-slate-500">{rotulo}</span>
    </Link>
  )
}

interface ItemLista {
  chave: string
  to: string
  principal: string
  secundario: string
  selo: string
  tom: Tom
}

const MAX_ITENS = 5

function Lista({ titulo, vazio, itens }: { titulo: string; vazio: string; itens: ItemLista[] }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
      {itens.length === 0 ? (
        <p className="text-xs text-slate-400">{vazio}</p>
      ) : (
        <ul className="flex flex-col">
          {itens.slice(0, MAX_ITENS).map((i) => (
            <li key={i.chave}>
              <Link to={i.to} className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-slate-50">
                <span className="min-w-0 truncate">
                  <span className="font-medium text-slate-700">{i.principal}</span>
                  {i.secundario && <span className="text-slate-400"> · {i.secundario}</span>}
                </span>
                <span className={`shrink-0 font-semibold ${TOM_NUMERO[i.tom]}`}>{i.selo}</span>
              </Link>
            </li>
          ))}
          {itens.length > MAX_ITENS && <li className="px-1.5 pt-0.5 text-[11px] text-slate-400">+ {itens.length - MAX_ITENS} outro(s)</li>}
        </ul>
      )}
    </div>
  )
}
