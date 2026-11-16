import { AlertTriangle, ArrowLeft, Clock, FileSignature, Gauge, List, Mail, MessageCircle, Package, Pencil, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CobrancaLote } from '@/components/ocs/CobrancaLote'
import { ClasseBadge } from '@/components/ocs/desempenho'
import { FornecedorForm } from '@/components/ocs/FornecedorForm'
import { BadgePrazo, BadgePrioridade } from '@/components/ocs/ocVisual'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Campo, Destaque, NaoEncontrado, Secao } from '@/components/ui/Detalhe'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { StatusDot } from '@/components/ui/StatusDot'
import { HOSPITAIS } from '@/constants'
import { useComodatosPorContrato, useContratos } from '@/hooks/useContratos'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { useHospital } from '@/hooks/useHospital'
import { useOpmes } from '@/hooks/useOpmes'
import { useSols } from '@/hooks/useSols'
import type { HistOC } from '@/types'
import { statusVigencia } from '@/utils/contrato'
import { fmt, getHoje } from '@/utils/date'
import { tomPct } from '@/utils/desempenhoUi'
import {
  confiabilidadePrevisao,
  desempenhoPorFornecedor,
  formatarDias,
  formatarPct,
  ligarContratosFornecedores,
  STATUS_ENTREGA_INFO as STATUS,
} from '@/utils/kpis'
import { montarLinhas, ORIGEM_ENTREGA } from '@/utils/ocLista'
import { diasAteCirurgia, STATUS_OPME_LABEL, STATUS_OPME_TONE } from '@/utils/opme'

const LIMITE_ABERTAS = 15
const LIMITE_ENTREGUES = 15

function dataISO(iso: string) {
  return iso.split('-').reverse().join('/')
}

/**
 * Página do fornecedor (item 106) — substitui a antiga "Ficha do fornecedor"
 * no mesmo formato das outras páginas de detalhe: contato e cobrança no topo,
 * OCs abertas por urgência, desempenho de entrega, contratos e cirurgias de
 * OPME com este fornecedor.
 */
export default function FornecedorDetalhe() {
  const { fornecedorId } = useParams<{ fornecedorId: string }>()
  const { hospitalId } = useHospital()
  const { avaliacoes, forns, isLoading, error } = useAvaliacoesEntrega()
  const { data: sols = [] } = useSols(hospitalId)
  const { data: contratos = [] } = useContratos(hospitalId)
  const { data: opmes = [] } = useOpmes(hospitalId)
  const [modal, setModal] = useState<null | 'editar' | 'cobrar'>(null)

  const forn = forns.find((f) => String(f.id) === fornecedorId)

  const contratosForn = useMemo(
    () => (forn ? (ligarContratosFornecedores(contratos, [forn]).porFornecedor.get(forn.id) ?? []) : []),
    [contratos, forn],
  )
  const { data: comodatos } = useComodatosPorContrato(contratosForn.map((c) => c.id))

  const dados = useMemo(() => {
    if (!forn) return null
    const doForn = avaliacoes.filter((a) => a.oc.fornecedorId === forn.id)
    const desempenho = desempenhoPorFornecedor(doForn, forns)[0] ?? null
    const linhas = montarLinhas(doForn, sols, new Map<number, HistOC>(), getHoje())
    const abertas = linhas.filter((l) => l.aberta).sort((a, b) => (a.diasPrazo ?? 9999) - (b.diasPrazo ?? 9999))
    const entregues = doForn
      .filter((a) => a.dataEntrega)
      .sort((a, b) => (b.dataEntrega?.getTime() ?? 0) - (a.dataEntrega?.getTime() ?? 0))
    return { desempenho, linhas, abertas, entregues, total: doForn.length }
  }, [avaliacoes, forns, sols, forn])

  const opmesForn = useMemo(() => {
    if (!forn) return []
    const hoje = getHoje()
    return opmes
      .filter((o) => o.fornecedorId === forn.id)
      .sort((a, b) => {
        // Pendentes futuras primeiro (por data), depois o resto do mais recente pro mais antigo.
        const fa = a.status === 'pendente' && (diasAteCirurgia(a.dataCirurgia, hoje) ?? -1) >= 0
        const fb = b.status === 'pendente' && (diasAteCirurgia(b.dataCirurgia, hoje) ?? -1) >= 0
        if (fa !== fb) return fa ? -1 : 1
        return fa ? a.dataCirurgia.localeCompare(b.dataCirurgia) : b.dataCirurgia.localeCompare(a.dataCirurgia)
      })
      .slice(0, 8)
  }, [opmes, forn])

  if (isLoading) return <SkeletonRows />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar o fornecedor: {error.message}</p>
  if (!forn || !dados) {
    return (
      <NaoEncontrado
        texto={`Fornecedor ${fornecedorId} não encontrado no cadastro. Ele pode ter sido excluído.`}
        voltarPara="/ocs/cadastro-fornecedores"
        voltarRotulo="Voltar para o cadastro de fornecedores"
      />
    )
  }

  const { desempenho, abertas, entregues } = dados
  const r = desempenho?.resumo
  const previsao = confiabilidadePrevisao(desempenho?.avaliacoes ?? [])
  const prazo = desempenho?.avaliacoes[0]
  const vencidas = abertas.filter((l) => (l.diasPrazo ?? 0) < 0).length
  const ativos = contratosForn.filter((c) => c.status === 'Ativo' && statusVigencia(c) !== 'vencido')
  const semContato = !forn.email && !forn.wpp
  const linkOCs = `/ocs/ordens?visao=todas&q=${encodeURIComponent(forn.nome)}`

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link to="/ocs/cadastro-fornecedores" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Cadastro de fornecedores
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <ClasseBadge classe={desempenho?.classe ?? null} avaliadas={r?.avaliadas ?? 0} grande />
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{forn.nome}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono">Cód. {forn.id}</span>
                {forn.cnpj && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono">{forn.cnpj}</span>
                  </>
                )}
                <span className="text-slate-300">·</span>
                <span>{desempenho?.classe?.acao ?? 'Sem nota (menos de 5 OCs avaliadas)'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={linkOCs}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              <List className="h-4 w-4" /> Ver todas as OCs
            </Link>
            <Button variant="outline" onClick={() => setModal('editar')}>
              <Pencil className="h-4 w-4" /> Editar contato
            </Button>
            <Button onClick={() => setModal('cobrar')} disabled={abertas.length === 0} title={abertas.length ? undefined : 'Nenhuma OC aberta'}>
              <Send className="h-4 w-4" /> Cobrar abertas ({abertas.length})
            </Button>
          </div>
        </div>
      </div>

      {semContato && abertas.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-status-amber/30 bg-status-amber-bg p-3 text-sm text-status-amber">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Sem e-mail nem WhatsApp no cadastro — a cobrança só gera a mensagem pra copiar.{' '}
            <button type="button" onClick={() => setModal('editar')} className="font-semibold underline">
              Cadastrar contato
            </button>
          </span>
        </div>
      )}

      {/* Números-chave */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Destaque
          icone={<Gauge className="h-4 w-4" />}
          rotulo="Entrega no prazo e completa (OTIF)"
          valor={r ? formatarPct(r.otif) : ''}
          detalhe={r ? `${r.perfeitas} de ${r.avaliadas} OCs · ${HOSPITAIS[hospitalId].sigla}` : 'nenhuma OC no hospital ativo'}
        />
        <Destaque
          icone={<Clock className="h-4 w-4" />}
          rotulo="Tempo de entrega"
          valor={r ? formatarDias(r.leadTimeMediana) : ''}
          detalhe={prazo ? `prazo considerado: ${prazo.prazoDias}d (${prazo.prazoFonte === 'contrato' ? 'contrato' : 'padrão'})` : undefined}
        />
        <Destaque
          icone={<Package className="h-4 w-4" />}
          rotulo="OCs abertas"
          valor={abertas.length ? `${abertas.length} aberta(s)` : 'Nenhuma'}
          detalhe={abertas.length ? `${vencidas} além da data prometida` : `${dados.total} OC(s) no total`}
        />
        <Destaque
          icone={<FileSignature className="h-4 w-4" />}
          rotulo="Contratos"
          valor={contratosForn.length ? `${ativos.length} ativo(s)` : 'Nenhum'}
          detalhe={contratosForn.length ? `${contratosForn.length} no total` : 'compra avulsa'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Secao
            titulo={`OCs abertas (${abertas.length})`}
            acao={
              abertas.length > LIMITE_ABERTAS ? (
                <Link to={`/ocs/ordens?visao=abertas&q=${encodeURIComponent(forn.nome)}`} className="text-xs font-medium text-blue-700 hover:underline">
                  Ver todas →
                </Link>
              ) : undefined
            }
          >
            {abertas.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma OC aberta com este fornecedor no {HOSPITAIS[hospitalId].sigla}.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {abertas.slice(0, LIMITE_ABERTAS).map((l) => (
                  <li key={l.oc.id}>
                    <Link to={`/ocs/ordens/${l.oc.id}`} className="flex flex-col gap-1 py-2.5 hover:text-blue-700 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <span className="min-w-0">
                        <span className="whitespace-nowrap font-mono text-sm font-semibold text-slate-800">OC {l.oc.id}</span>
                        <span className="ml-2 truncate text-xs text-slate-500">{l.sol?.produto ?? l.oc.sit}</span>
                      </span>
                      <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-slate-500">
                        {l.oc.previsaoForn ? <span>prev. {l.oc.previsaoForn}</span> : <span className="text-status-amber">sem previsão</span>}
                        {l.prioridade && <BadgePrioridade prioridade={l.prioridade} />}
                        <BadgePrazo linha={l} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Desempenho de entrega">
            {!r ? (
              <p className="text-xs text-slate-400">Nenhuma OC deste fornecedor no hospital ativo.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <KpiCard label="OTIF" value={formatarPct(r.otif)} sub={`${r.perfeitas} de ${r.avaliadas}`} tone={tomPct(r.otif)} />
                <KpiCard label="No prazo" value={formatarPct(r.onTime)} tone={tomPct(r.onTime)} />
                <KpiCard label="Completa (por OC)" value={formatarPct(r.inFull)} tone={tomPct(r.inFull)} />
                <KpiCard label="Tempo de entrega" value={formatarDias(r.leadTimeMediana)} sub={`mediana · P90 ${formatarDias(r.leadTimeP90)}`} tone="blue" />
                <KpiCard label="Previsões cumpridas" value={formatarPct(previsao.pct)} sub={`${previsao.total} com previsão`} tone={tomPct(previsao.pct)} />
                <KpiCard label="Abertas vencidas" value={r.abertasVencidas} sub={`${r.abertasNoPrazo} abertas no prazo`} tone={r.abertasVencidas ? 'red' : 'gray'} />
              </div>
            )}
          </Secao>

          <Secao titulo={`Entregas recentes (${entregues.length})`}>
            {entregues.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma entrega registrada ainda.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {entregues.slice(0, LIMITE_ENTREGUES).map((a) => {
                  const st = STATUS[a.status]
                  return (
                    <li key={a.oc.id}>
                      <Link to={`/ocs/ordens/${a.oc.id}`} className="flex flex-col gap-1 py-2 text-xs hover:text-blue-700 sm:flex-row sm:items-center sm:justify-between">
                        <span className="flex items-center gap-2">
                          <StatusDot tone={st.tone} label={st.label} />
                          <span className="font-mono font-semibold text-slate-800">OC {a.oc.id}</span>
                          <span className="text-slate-500">{st.label}</span>
                          {a.inFull === false && <span className="text-status-amber">· fracionada</span>}
                        </span>
                        <span className="flex flex-wrap gap-3 text-slate-400">
                          <span>Prometida {fmt(a.dataPrometida)}</span>
                          <span>
                            Entrada {fmt(a.dataEntrega)} ({ORIGEM_ENTREGA[a.oc.dataEntregaOrigem ?? 'estimada']})
                          </span>
                          {a.diasAtraso > 0 && <span className="text-status-red">+{a.diasAtraso}d</span>}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Secao>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Secao
            titulo="Contato"
            acao={
              <button type="button" onClick={() => setModal('editar')} className="text-xs font-medium text-blue-700 hover:underline">
                Editar
              </button>
            }
          >
            <dl className="flex flex-col gap-3">
              <Campo rotulo="E-mail">
                {forn.email && (
                  <a href={`mailto:${forn.email}`} className="inline-flex items-center gap-1 break-all text-blue-700 hover:underline">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> {forn.email}
                  </a>
                )}
              </Campo>
              <Campo rotulo="WhatsApp">
                {forn.wpp && (
                  <a href={`https://wa.me/${forn.wpp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" /> {forn.wpp}
                  </a>
                )}
              </Campo>
              <Campo rotulo="CNPJ">{forn.cnpj ?? ''}</Campo>
              <Campo rotulo="Código no SoulMV">{forn.id}</Campo>
            </dl>
          </Secao>

          <Secao titulo={`Contratos e acordos (${contratosForn.length})`}>
            {contratosForn.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum contrato com este fornecedor (casamento por CNPJ ou nome).</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {contratosForn.map((c) => {
                  const venc = statusVigencia(c)
                  const qtd = comodatos?.get(c.id) ?? 0
                  return (
                    <li key={c.id}>
                      <Link to={`/contratos/${c.id}`} className="flex flex-col gap-0.5 py-2 hover:text-blue-700">
                        <span className="text-sm font-medium text-slate-800">{c.titulo || c.tipo}</span>
                        <span className="flex flex-wrap gap-x-2 text-xs text-slate-500">
                          <span>{c.status}</span>
                          {c.vigenciaFim && (
                            <span className={venc === 'vencido' ? 'text-status-red' : venc === 'critico' ? 'text-status-amber' : ''}>
                              até {dataISO(c.vigenciaFim)}
                            </span>
                          )}
                          {c.prazoMedioDias ? <span>prazo {c.prazoMedioDias}d</span> : null}
                          {qtd > 0 && <span className="text-status-purple">{qtd} equip. em comodato</span>}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Secao>

          <Secao titulo="Cirurgias com OPME">
            {opmesForn.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma cirurgia com OPME deste fornecedor no {HOSPITAIS[hospitalId].sigla}.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {opmesForn.map((o) => (
                  <li key={o.id}>
                    <Link to={`/opmes/${o.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-blue-700">
                      <span className="min-w-0">
                        <span className="font-medium text-slate-800">{dataISO(o.dataCirurgia)}</span>
                        <span className="ml-2 truncate text-xs text-slate-500">{o.paciente}</span>
                      </span>
                      <Badge tone={STATUS_OPME_TONE[o.status]}>{STATUS_OPME_LABEL[o.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </aside>
      </div>

      {modal === 'editar' && <FornecedorForm forn={forn} onClose={() => setModal(null)} />}
      {modal === 'cobrar' && <CobrancaLote linhas={abertas} forns={forns} hospitalId={hospitalId} onClose={() => setModal(null)} />}
    </div>
  )
}
