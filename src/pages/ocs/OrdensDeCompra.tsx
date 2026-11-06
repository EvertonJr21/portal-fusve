import { useMemo, useState } from 'react'
import { CobrancaLote } from '@/components/ocs/CobrancaLote'
import { BarraFiltrosOC } from '@/components/ocs/lista/BarraFiltrosOC'
import { TabelaOCs } from '@/components/ocs/lista/TabelaOCs'
import { OCCobrar } from '@/components/ocs/OCCobrar'
import { OCForm } from '@/components/ocs/OCForm'
import { OCPainel, type AcaoPainel } from '@/components/ocs/OCPainel'
import { OCVincular } from '@/components/ocs/OCVincular'
import { Button } from '@/components/ui/Button'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { Pagination } from '@/components/ui/Pagination'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { FINAL_SIT, MOTIVOS_OCORRENCIA, type SituacaoOC } from '@/constants'
import { useConfirm } from '@/hooks/useConfirm'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { useEstadoListaOCs } from '@/hooks/useEstadoListaOCs'
import { useHistoricoRecentePorOC, useMarcarRespondida, useMarcarRespondidas } from '@/hooks/useHistOC'
import { useHospital } from '@/hooks/useHospital'
import { useAtualizarOC, useAtualizarOCsEmLote, useAtualizarSituacaoOC, useExcluirOC } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import type { HistOC, OC } from '@/types'
import { fmt, getHoje } from '@/utils/date'
import { exportarExcel } from '@/utils/exportar'
import {
  agruparPorFornecedor,
  contarVisoes,
  filtrarLinhas,
  montarLinhas,
  naVisao,
  ordenarLinhas,
  textoPrazo,
  VISOES_OC,
  type GrupoFornecedor,
  type LinhaOC,
} from '@/utils/ocLista'

const POR_PAGINA = 25
const GRUPOS_POR_PAGINA = 12

type Modal =
  | { tipo: 'novo' }
  | { tipo: 'editar'; oc: OC }
  | { tipo: 'vincular'; oc: OC }
  | { tipo: 'cobrar'; linha: LinhaOC; canal: 'mail' | 'wpp' }
  | { tipo: 'lote'; linhas: LinhaOC[] }
  | null

/**
 * Ordens de Compra (redesenho do item 82) — a tela de trabalho do comprador.
 * Concentra o que antes estava espalhado em Central de Pendências (prioridade e
 * ação recomendada), Por Fornecedor (agrupamento e cobrança em lote) e Análise de
 * Causas (motivo do atraso). Padrão de lista de pedidos de ERP: visões salvas em
 * abas, uma barra de filtros, painel lateral da OC e ações em lote na seleção.
 */
export default function OrdensDeCompra() {
  const { hospitalId } = useHospital()
  // Trocar de hospital recomeça seleção, painel e página.
  return <TelaOrdensDeCompra key={hospitalId} />
}

function TelaOrdensDeCompra() {
  const { hospitalId } = useHospital()
  const { avaliacoes, forns, isLoading, error } = useAvaliacoesEntrega()
  const { data: sols = [] } = useSols(hospitalId)
  const estado = useEstadoListaOCs()
  const atualizarSituacao = useAtualizarSituacaoOC(hospitalId)
  const atualizarCampos = useAtualizarOC(hospitalId)
  const atualizarLote = useAtualizarOCsEmLote(hospitalId)
  const marcarRespondida = useMarcarRespondida()
  const marcarRespondidas = useMarcarRespondidas()
  const excluir = useExcluirOC(hospitalId)
  const toast = useToast()
  const confirmar = useConfirm()

  const [modal, setModal] = useState<Modal>(null)
  const [painelId, setPainelId] = useState<number | null>(null)
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set())
  const [paginaEstado, setPaginaEstado] = useState({ chave: '', pagina: 0 })

  // Última cobrança só das OCs abertas (as fechadas não precisam e a lista de ids fica curta).
  const idsAbertas = useMemo(
    () => avaliacoes.filter((a) => !(FINAL_SIT as readonly string[]).includes(a.oc.sit)).map((a) => a.oc.id),
    [avaliacoes],
  )
  const { data: ultimas } = useHistoricoRecentePorOC(idsAbertas)

  const linhas = useMemo(
    () => montarLinhas(avaliacoes, sols, ultimas ?? new Map<number, HistOC>(), getHoje()),
    [avaliacoes, sols, ultimas],
  )
  const filtradas = useMemo(() => filtrarLinhas(linhas, estado.filtros), [linhas, estado.filtros])
  const contagem = useMemo(() => contarVisoes(filtradas), [filtradas])
  const daVisao = useMemo(
    () => ordenarLinhas(filtradas.filter((l) => naVisao(l, estado.visao)), estado.ordem.chave, estado.ordem.dir),
    [filtradas, estado.visao, estado.ordem],
  )
  const grupos = useMemo(() => (estado.agrupar ? agruparPorFornecedor(daVisao) : null), [estado.agrupar, daVisao])
  const estoques = useMemo(() => [...new Set(linhas.map((l) => l.oc.estoque).filter((e): e is string => !!e))].sort(), [linhas])

  // Mudou visão/filtro/agrupamento → volta pra 1ª página.
  const chavePagina = `${estado.visao}|${JSON.stringify(estado.filtros)}|${estado.agrupar}`
  const pagina = paginaEstado.chave === chavePagina ? paginaEstado.pagina : 0
  const setPagina = (p: number) => setPaginaEstado({ chave: chavePagina, pagina: p })

  const gruposPagina = grupos ? grupos.slice(pagina * GRUPOS_POR_PAGINA, (pagina + 1) * GRUPOS_POR_PAGINA) : null
  const linhasPagina = gruposPagina ? gruposPagina.flatMap((g) => g.linhas) : daVisao.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)

  const linhaPainel = painelId !== null ? (linhas.find((l) => l.oc.id === painelId) ?? null) : null
  const linhasSelecionadas = linhas.filter((l) => selecionadas.has(l.oc.id))
  const fornDe = (oc: OC) => (oc.fornecedorId ? forns.find((f) => f.id === oc.fornecedorId) : undefined)

  const selecionar = (ids: number[], marcar: boolean) =>
    setSelecionadas((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (marcar) next.add(id)
        else next.delete(id)
      }
      return next
    })

  const erro = (err: unknown, padrao: string) => toast.show(err instanceof Error ? err.message : padrao, 'error')

  const handleSituacao = async (oc: OC, sit: string) => {
    try {
      await atualizarSituacao.mutateAsync({ id: oc.id, sit: sit as SituacaoOC })
      toast.show(`OC ${oc.id} → ${sit}`)
    } catch (err) {
      erro(err, 'Erro ao atualizar situação')
    }
  }

  const handlePrevisao = async (oc: OC, previsaoForn: string | null) => {
    try {
      await atualizarCampos.mutateAsync({ id: oc.id, patch: { previsaoForn, ultimaMovimentacao: fmt(getHoje()) } })
      toast.show(previsaoForn ? `Previsão da OC ${oc.id}: ${previsaoForn}` : `Previsão da OC ${oc.id} removida`)
    } catch (err) {
      erro(err, 'Erro ao atualizar previsão')
    }
  }

  const handleRespondida = async (h: HistOC) => {
    try {
      await marcarRespondida.mutateAsync({ hid: h.hid, ocId: h.ocId })
      toast.show(`OC ${h.ocId} — fornecedor respondeu`)
    } catch (err) {
      erro(err, 'Erro ao registrar resposta')
    }
  }

  const handleExcluir = async (oc: OC) => {
    if (!(await confirmar({ message: `Excluir a OC ${oc.id}?`, tone: 'danger', confirmLabel: 'Excluir' }))) return
    try {
      await excluir.mutateAsync(oc.id)
      setPainelId((id) => (id === oc.id ? null : id))
      selecionar([oc.id], false)
      toast.show(`OC ${oc.id} excluída`)
    } catch (err) {
      erro(err, 'Erro ao excluir OC')
    }
  }

  const handleAcaoPainel = (acao: AcaoPainel, oc: OC) => {
    const linha = linhas.find((l) => l.oc.id === oc.id)
    if (acao === 'cobrar-mail' && linha) setModal({ tipo: 'cobrar', linha, canal: 'mail' })
    else if (acao === 'cobrar-wpp' && linha) setModal({ tipo: 'cobrar', linha, canal: 'wpp' })
    else if (acao === 'vincular') setModal({ tipo: 'vincular', oc })
    else if (acao === 'editar') setModal({ tipo: 'editar', oc })
    else if (acao === 'excluir') void handleExcluir(oc)
  }

  // ── ações em lote ──
  const definirMotivo = async (motivo: string | null) => {
    const ids = [...selecionadas]
    try {
      await atualizarLote.mutateAsync({ ids, patch: { motivoAtraso: motivo } })
      toast.show(motivo ? `Motivo "${motivo}" em ${ids.length} OC(s)` : `Motivo removido de ${ids.length} OC(s)`)
    } catch (err) {
      erro(err, 'Erro ao definir motivo')
    }
  }

  const pendentesSelecao = linhasSelecionadas.filter((l) => l.cobrancaPendente && l.ultimaCobranca)
  const marcarSelecaoRespondida = async () => {
    try {
      await marcarRespondidas.mutateAsync(pendentesSelecao.map((l) => ({ hid: l.ultimaCobranca!.hid, ocId: l.oc.id })))
      toast.show(`${pendentesSelecao.length} cobrança(s) marcada(s) como respondida(s)`)
    } catch (err) {
      erro(err, 'Erro ao registrar respostas')
    }
  }

  const exportarSelecao = async () => {
    const lista = linhasSelecionadas.length ? linhasSelecionadas : daVisao
    await exportarExcel(`ocs-${estado.visao}-${fmt(getHoje()).replace(/\//g, '-')}`, [
      {
        nome: 'OCs',
        linhas: lista.map((l) => ({
          OC: l.oc.id,
          'Data da OC': fmt(l.avaliacao.dataOC),
          Fornecedor: l.oc.fornecedorNome,
          Situação: l.oc.sit,
          Estoque: l.oc.estoque ?? '',
          Solicitação: l.oc.solicitacaoId ?? '',
          Produto: l.sol?.produto ?? '',
          'Data prometida': fmt(l.avaliacao.dataPrometida),
          Prazo: textoPrazo(l),
          'Prazo institucional': fmt(l.prazoInstitucional),
          'Previsão do fornecedor': l.oc.previsaoForn ?? '',
          'Entrega': l.oc.dataEntregaReal ?? '',
          'Origem da data': l.oc.dataEntregaOrigem ?? '',
          'Última cobrança': l.ultimaCobranca ? new Date(l.ultimaCobranca.ts).toLocaleDateString('pt-BR') : '',
          'Cobrança respondida': l.ultimaCobranca ? (l.cobrancaPendente ? 'Não' : 'Sim') : '',
          Motivo: l.oc.motivoAtraso ?? '',
          Prioridade: l.prioridade ?? '',
          'Ação recomendada': l.acao,
        })),
      },
    ])
  }

  const abertas = contagem.abertas
  const visaoAtual = VISOES_OC.find((v) => v.id === estado.visao)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Ordens de Compra</h2>
          <p className="text-sm text-slate-500">
            {isLoading
              ? 'Carregando...'
              : `${abertas} aberta(s) · ${contagem.acao} precisa(m) de ação · ${contagem.vencidas} vencida(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarSelecao} disabled={isLoading || daVisao.length === 0}>
            ⤓ Exportar {selecionadas.size ? 'seleção' : 'visão'}
          </Button>
          <Button onClick={() => setModal({ tipo: 'novo' })}>+ Nova OC</Button>
        </div>
      </div>

      {error && <p className="text-sm text-status-red">Erro ao carregar OCs: {error.message}</p>}

      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1" aria-label="Visões">
        {VISOES_OC.map((v) => {
          const ativa = estado.visao === v.id
          const n = contagem[v.id]
          const alerta = (v.id === 'acao' || v.id === 'vencidas') && n > 0
          return (
            <button
              key={v.id}
              type="button"
              title={v.dica}
              onClick={() => estado.setVisao(v.id)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                ativa ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {v.label}
              <span
                className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${
                  alerta ? 'bg-status-red-bg text-status-red' : ativa ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isLoading ? '…' : n}
              </span>
            </button>
          )
        })}
      </nav>
      {visaoAtual && <p className="-mt-2 text-xs text-slate-400">{visaoAtual.dica}</p>}

      <BarraFiltrosOC
        filtros={estado.filtros}
        onFiltros={estado.setFiltros}
        estoques={estoques}
        colunas={estado.colunas}
        onAlternarColuna={estado.alternarColuna}
        agrupar={estado.agrupar}
        onAgrupar={estado.setAgrupar}
      />

      {selecionadas.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 shadow-soft-md">
          <span className="text-sm font-semibold text-blue-900">{selecionadas.size} selecionada(s)</span>
          {daVisao.length > selecionadas.size && (
            <button type="button" className="text-xs text-blue-700 hover:underline" onClick={() => selecionar(daVisao.map((l) => l.oc.id), true)}>
              selecionar todas as {daVisao.length} desta visão
            </button>
          )}
          <span className="mx-1 hidden h-5 w-px bg-blue-200 sm:block" aria-hidden />
          <Button size="sm" onClick={() => setModal({ tipo: 'lote', linhas: linhasSelecionadas })}>
            ✉ Cobrar em lote
          </Button>
          <Dropdown
            align="left"
            trigger={
              <Button size="sm" variant="outline" className="bg-white">
                Motivo ▾
              </Button>
            }
          >
            {MOTIVOS_OCORRENCIA.map((m) => (
              <DropdownItem key={m} onClick={() => definirMotivo(m)}>
                {m}
              </DropdownItem>
            ))}
            <DropdownItem tone="danger" onClick={() => definirMotivo(null)}>
              Remover motivo
            </DropdownItem>
          </Dropdown>
          <Button
            size="sm"
            variant="outline"
            className="bg-white"
            disabled={pendentesSelecao.length === 0}
            loading={marcarRespondidas.isPending}
            onClick={marcarSelecaoRespondida}
            title="Marca a última cobrança de cada OC selecionada como respondida"
          >
            ✓ Responderam ({pendentesSelecao.length})
          </Button>
          <button type="button" className="ml-auto text-xs text-slate-500 hover:underline" onClick={() => setSelecionadas(new Set())}>
            Limpar seleção
          </button>
        </div>
      )}

      {isLoading ? (
        <SkeletonRows colunas={8} />
      ) : (
        <>
          <TabelaOCs
            linhas={linhasPagina}
            grupos={gruposPagina}
            colunas={estado.colunas}
            ordem={estado.ordem}
            onOrdenar={estado.ordenarPor}
            selecionadas={selecionadas}
            onSelecionar={selecionar}
            abertaId={painelId}
            onAbrir={(l) => setPainelId(l.oc.id)}
            onSituacao={handleSituacao}
            onPrevisao={handlePrevisao}
            onVincular={(oc) => setModal({ tipo: 'vincular', oc })}
            onRespondida={handleRespondida}
            onCobrarGrupo={(g: GrupoFornecedor) => setModal({ tipo: 'lote', linhas: g.linhas })}
          />
          <Pagination
            page={pagina}
            pageSize={grupos ? GRUPOS_POR_PAGINA : POR_PAGINA}
            totalItems={grupos ? grupos.length : daVisao.length}
            onPageChange={setPagina}
          />
          {grupos && <p className="-mt-2 text-xs text-slate-400">Agrupado: a paginação conta fornecedores.</p>}
        </>
      )}

      {linhaPainel && (
        <OCPainel
          key={linhaPainel.oc.id}
          linha={linhaPainel}
          forn={fornDe(linhaPainel.oc)}
          hospitalId={hospitalId}
          onClose={() => setPainelId(null)}
          onAcao={handleAcaoPainel}
        />
      )}

      {modal?.tipo === 'novo' && <OCForm oc={null} hospitalId={hospitalId} onClose={() => setModal(null)} />}
      {modal?.tipo === 'editar' && <OCForm oc={modal.oc} hospitalId={hospitalId} onClose={() => setModal(null)} />}
      {modal?.tipo === 'vincular' && <OCVincular oc={modal.oc} sols={sols} hospitalId={hospitalId} onClose={() => setModal(null)} />}
      {modal?.tipo === 'cobrar' && (
        <OCCobrar
          oc={modal.linha.oc}
          sols={sols}
          forn={fornDe(modal.linha.oc)}
          hospitalId={hospitalId}
          canalInicial={modal.canal}
          prazoEntrega={modal.linha.avaliacao.dataPrometida}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === 'lote' && (
        <CobrancaLote linhas={modal.linhas} forns={forns} hospitalId={hospitalId} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
