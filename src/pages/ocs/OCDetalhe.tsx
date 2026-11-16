import { ArrowLeft, CalendarCheck, CalendarClock, Link2, Mail, MessageCircle, Package, Pencil, Stethoscope, Trash2, Truck } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ContratosDoFornecedor, LinhaDoTempoOC, RegistroOC } from '@/components/ocs/OCDetalhes'
import { OCCobrar } from '@/components/ocs/OCCobrar'
import { OCForm } from '@/components/ocs/OCForm'
import { OCVincular } from '@/components/ocs/OCVincular'
import { BadgePrazo, BadgePrioridade } from '@/components/ocs/ocVisual'
import { Button } from '@/components/ui/Button'
import { HistoricoAlteracoes } from '@/components/ui/HistoricoAlteracoes'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { HOSPITAIS } from '@/constants'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { useDesfazer } from '@/hooks/useDesfazer'
import { useGuardaSaida } from '@/hooks/useGuardaSaida'
import { useHistoricoRecentePorOC } from '@/hooks/useHistOC'
import { useHospital } from '@/hooks/useHospital'
import { useExcluirOC } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import type { HistOC } from '@/types'
import { diasEntre, fmt, getHoje, parseDMY } from '@/utils/date'
import { montarLinhas, ORIGEM_ENTREGA } from '@/utils/ocLista'

type Modal = null | 'mail' | 'wpp' | 'vincular' | 'editar'
const SEM_CANCELAR = () => {}

function Valor({ children }: { children: ReactNode }) {
  const vazio = children === null || children === undefined || children === '' || children === '—'
  return vazio ? <span className="text-slate-300">—</span> : <>{children}</>
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{rotulo}</dt>
      <dd className="break-words text-sm text-slate-800">
        <Valor>{children}</Valor>
      </dd>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm md:p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{titulo}</h3>
      {children}
    </section>
  )
}

function Destaque({ icone, rotulo, valor, detalhe }: { icone: ReactNode; rotulo: string; valor: ReactNode; detalhe?: ReactNode }) {
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

/**
 * Página da OC (item 104) — o painel lateral da lista continua sendo a
 * "espiada" rápida; esta é a página completa (mesmo padrão das páginas de
 * contrato e de OPME), com link próprio pra abrir/compartilhar.
 */
export default function OCDetalhe() {
  const { ocId = '' } = useParams<{ ocId: string }>()
  const id = Number(ocId)
  const navigate = useNavigate()
  const { hospitalId } = useHospital()
  const { avaliacoes, forns, isLoading, error } = useAvaliacoesEntrega()
  const { data: sols = [] } = useSols(hospitalId)
  const idsHist = useMemo(() => (Number.isFinite(id) ? [id] : []), [id])
  const { data: ultimas } = useHistoricoRecentePorOC(idsHist)
  const excluir = useExcluirOC(hospitalId)
  const desfazer = useDesfazer()
  const toast = useToast()
  const guarda = useGuardaSaida(SEM_CANCELAR)
  const [modal, setModal] = useState<Modal>(null)

  const linha = useMemo(() => {
    const a = avaliacoes.find((x) => x.oc.id === id)
    return a ? (montarLinhas([a], sols, ultimas ?? new Map<number, HistOC>(), getHoje())[0] ?? null) : null
  }, [avaliacoes, sols, ultimas, id])

  // Outras OCs abertas do mesmo fornecedor — dá pra cobrar tudo junto.
  const outrasAbertas = useMemo(() => {
    if (!linha?.oc.fornecedorId) return []
    const doForn = avaliacoes.filter((a) => a.oc.fornecedorId === linha.oc.fornecedorId && a.oc.id !== id)
    return montarLinhas(doForn, sols, new Map(), getHoje())
      .filter((l) => l.aberta)
      .sort((a, b) => (a.diasPrazo ?? 9999) - (b.diasPrazo ?? 9999))
  }, [avaliacoes, sols, linha, id])

  if (isLoading) return <SkeletonRows />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar a OC: {error.message}</p>
  if (!linha) {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <p className="text-sm text-slate-600">
          OC {ocId} não encontrada no {HOSPITAIS[hospitalId].sigla}. Ela pode ser do outro hospital ou ter sido excluída.
        </p>
        <Link to="/ocs/ordens" className="text-sm font-medium text-blue-700 hover:underline">
          ← Voltar para Ordens de Compra
        </Link>
      </div>
    )
  }

  const { oc, avaliacao, sol } = linha
  const forn = oc.fornecedorId ? forns.find((f) => f.id === oc.fornecedorId) : undefined
  const desvioPrevisao = (() => {
    const p = parseDMY(oc.previsaoForn)
    const e = parseDMY(oc.dataEntregaReal)
    return p && e ? diasEntre(p, e) : null
  })()

  const handleExcluir = async () => {
    try {
      await excluir.mutateAsync(oc.id)
      desfazer(`OC ${oc.id} excluída`, 'ocs', oc.id, ['ocs', hospitalId])
      navigate('/ocs/ordens')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir OC', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link to="/ocs/ordens" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Ordens de Compra
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-bold tracking-tight text-slate-900 md:text-2xl">OC {oc.id}</h1>
              <BadgePrazo linha={linha} />
              {linha.prioridade && <BadgePrioridade prioridade={linha.prioridade} />}
            </div>
            <p className="mt-1 text-sm text-slate-600">{oc.fornecedorNome}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{oc.sit}</span>
              {oc.estoque && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{oc.estoque}</span>
                </>
              )}
              <span className="text-slate-300">·</span>
              <span>{HOSPITAIS[oc.hospitalId].sigla}</span>
            </div>
            {linha.aberta && linha.acao && <p className="mt-2 text-sm font-medium text-slate-700">➜ {linha.acao}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!forn?.email} title={forn?.email || 'Fornecedor sem e-mail no cadastro'} onClick={() => setModal('mail')}>
              <Mail className="h-4 w-4" /> Cobrar por e-mail
            </Button>
            <Button variant="outline" disabled={!forn?.wpp} title={forn?.wpp || 'Fornecedor sem WhatsApp no cadastro'} onClick={() => setModal('wpp')}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
            <Button variant="outline" onClick={handleExcluir}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
            <Button onClick={() => setModal('editar')}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </div>
        </div>
      </div>

      {/* Números-chave */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Destaque icone={<CalendarClock className="h-4 w-4" />} rotulo="Data da OC" valor={fmt(avaliacao.dataOC)} detalhe={`Prazo institucional ${fmt(linha.prazoInstitucional)}`} />
        <Destaque
          icone={<CalendarCheck className="h-4 w-4" />}
          rotulo="Data prometida"
          valor={fmt(avaliacao.dataPrometida)}
          detalhe={`${avaliacao.prazoDias} dias · ${avaliacao.prazoFonte === 'contrato' ? 'prazo do contrato' : 'prazo padrão'}`}
        />
        <Destaque
          icone={<Truck className="h-4 w-4" />}
          rotulo="Previsão do fornecedor"
          valor={oc.previsaoForn || 'Sem previsão'}
          detalhe={linha.previsaoDescumprida ? 'previsão descumprida' : desvioPrevisao !== null ? (desvioPrevisao <= 0 ? 'cumprida' : `entregue ${desvioPrevisao}d depois`) : undefined}
        />
        <Destaque
          icone={<Package className="h-4 w-4" />}
          rotulo="Entrega"
          valor={oc.dataEntregaReal || (oc.dataParcial ? `Parcial em ${oc.dataParcial}` : 'Ainda não entregue')}
          detalhe={
            oc.dataEntregaReal
              ? `${ORIGEM_ENTREGA[oc.dataEntregaOrigem ?? 'estimada']}${avaliacao.leadTimeDias !== null ? ` · lead time ${avaliacao.leadTimeDias}d` : ''}`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Secao titulo="Registrar">
            <RegistroOC key={oc.id} oc={oc} hospitalId={hospitalId} alterado={guarda.alterado} marcar={guarda.marcar} limpar={guarda.limpar} />
          </Secao>
          <Secao titulo="Linha do tempo">
            <LinhaDoTempoOC linha={linha} />
          </Secao>
          <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm md:p-5">
            <HistoricoAlteracoes tabela="ocs" registroId={oc.id} limite={50} />
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Secao titulo="Solicitação">
            {sol ? (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">#{sol.id}</div>
                  <div className="text-sm text-slate-700">{sol.produto}</div>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  <Campo rotulo="Quantidade">{sol.qtd || ''}</Campo>
                  <Campo rotulo="Data">{sol.data ?? ''}</Campo>
                  <Campo rotulo="Solicitante">{sol.solicitante}</Campo>
                  <Campo rotulo="Motivo">{sol.motivo}</Campo>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => setModal('vincular')}>
                    <Link2 className="h-3.5 w-3.5" /> Trocar
                  </Button>
                  <Button variant="ghost" onClick={() => navigate(`/pareceres?produto=${encodeURIComponent(sol.produto)}`)}>
                    <Stethoscope className="h-3.5 w-3.5" /> Parecer técnico
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-2">
                <p className="text-xs text-slate-400">{oc.solicitacaoId ? `Solicitação #${oc.solicitacaoId} (não importada)` : 'Nenhuma solicitação vinculada.'}</p>
                <Button variant="outline" onClick={() => setModal('vincular')}>
                  <Link2 className="h-3.5 w-3.5" /> Vincular solicitação
                </Button>
              </div>
            )}
          </Secao>

          <Secao titulo="Fornecedor">
            <dl className="flex flex-col gap-3">
              <Campo rotulo="Nome">{forn?.nome ?? oc.fornecedorNome}</Campo>
              <Campo rotulo="Contato">{[forn?.email, forn?.wpp].filter(Boolean).join(' · ')}</Campo>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contrato</dt>
                <dd className="text-sm">
                  <ContratosDoFornecedor forn={forn} hospitalId={hospitalId} />
                </dd>
              </div>
            </dl>
            {forn && (
              <Link to={`/ocs/ranking/${forn.id}`} className="mt-3 inline-block text-xs font-medium text-blue-700 hover:underline">
                Ficha e nota de entrega →
              </Link>
            )}
          </Secao>

          <Secao titulo={`Outras OCs abertas deste fornecedor (${outrasAbertas.length})`}>
            {outrasAbertas.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {outrasAbertas.slice(0, 10).map((l) => (
                  <li key={l.oc.id}>
                    <Link to={`/ocs/ordens/${l.oc.id}`} className="flex items-center justify-between gap-2 py-2 hover:text-blue-700">
                      <span className="font-mono text-xs font-semibold text-slate-700">{l.oc.id}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{l.sol?.produto ?? ''}</span>
                      <BadgePrazo linha={l} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Detalhes">
            <dl className="grid grid-cols-2 gap-3">
              <Campo rotulo="Situação">{oc.sit}</Campo>
              <Campo rotulo="Estoque">{oc.estoque ?? ''}</Campo>
              <Campo rotulo="Última movimentação">{linha.diasSemMov !== null ? `há ${linha.diasSemMov}d` : (oc.ultimaMovimentacao ?? '')}</Campo>
              <Campo rotulo="Entrada no MV">{oc.entradaMv}</Campo>
              <Campo rotulo="Motivo do atraso">{oc.motivoAtraso ?? ''}</Campo>
              <Campo rotulo="Próxima ação">{oc.proximaAcao ?? ''}</Campo>
            </dl>
          </Secao>
        </aside>
      </div>

      {(modal === 'mail' || modal === 'wpp') && (
        <OCCobrar
          oc={oc}
          sols={sols}
          forn={forn}
          hospitalId={hospitalId}
          canalInicial={modal}
          prazoEntrega={avaliacao.dataPrometida}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'vincular' && <OCVincular oc={oc} sols={sols} hospitalId={hospitalId} onClose={() => setModal(null)} />}
      {modal === 'editar' && <OCForm oc={oc} hospitalId={hospitalId} onClose={() => setModal(null)} />}
    </div>
  )
}
