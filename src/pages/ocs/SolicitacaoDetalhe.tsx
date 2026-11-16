import { ArrowLeft, CalendarDays, Clock, Hash, Package, Pencil, Stethoscope, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SolForm } from '@/components/ocs/SolForm'
import { BadgePrazo } from '@/components/ocs/ocVisual'
import { Button } from '@/components/ui/Button'
import { Campo, Destaque, NaoEncontrado, Secao } from '@/components/ui/Detalhe'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { HOSPITAIS, PRAZO } from '@/constants'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { useDesfazer } from '@/hooks/useDesfazer'
import { useHospital } from '@/hooks/useHospital'
import { usePareceres } from '@/hooks/usePareceres'
import { useAtualizarSituacaoSol, useExcluirSol, useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import type { HistOC } from '@/types'
import { addDias, diasEntre, fmt, getHoje, parseDMY } from '@/utils/date'
import { statusPrazo, textoSemaforo } from '@/utils/oc'
import { montarLinhas } from '@/utils/ocLista'
import { normalizarTexto } from '@/utils/produtos'

const SITUACOES_SOL = ['Aberta', 'Parcialmente Atendida', 'Fechada', 'Cancelada'] as const

const SEMAFORO_CLASS: Record<string, string> = {
  vencida: 'bg-status-red-bg text-status-red',
  urgente: 'bg-status-amber-bg text-status-amber',
  ok: 'bg-status-gray-bg text-status-gray',
  atendida: 'bg-status-green-bg text-status-green',
}

/**
 * Página da solicitação (item 105) — mesmo formato das páginas de OC, contrato
 * e OPME: dados da solicitação, prazo institucional, as OCs que saíram dela
 * (cada uma levando à própria página) e o parecer técnico do produto.
 */
export default function SolicitacaoDetalhe() {
  const { solId = '' } = useParams<{ solId: string }>()
  const id = Number(solId)
  const navigate = useNavigate()
  const { hospitalId } = useHospital()
  const { data: sols = [], isLoading, isFetching, error } = useSols(hospitalId)
  const { avaliacoes } = useAvaliacoesEntrega()
  const { data: pareceres = [] } = usePareceres()
  const atualizarSituacao = useAtualizarSituacaoSol(hospitalId)
  const excluir = useExcluirSol(hospitalId)
  const desfazer = useDesfazer()
  const toast = useToast()
  const [editando, setEditando] = useState(false)

  const sol = sols.find((s) => s.id === id) ?? null

  const ocs = useMemo(() => {
    if (!sol) return []
    const daSol = avaliacoes.filter((a) => a.oc.solicitacaoId === sol.id)
    return montarLinhas(daSol, sols, new Map<number, HistOC>(), getHoje()).sort((a, b) => b.oc.id - a.oc.id)
  }, [avaliacoes, sols, sol])

  // Parecer do produto: o nome da solicitação costuma ser o mesmo nome do SoulMV usado no parecer.
  const parecer = useMemo(() => {
    if (!sol?.produto) return null
    const alvo = normalizarTexto(sol.produto)
    return pareceres.find((p) => normalizarTexto(p.nome) === alvo) ?? null
  }, [sol, pareceres])

  if (isLoading || (!sol && isFetching)) return <SkeletonRows />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar a solicitação: {error.message}</p>
  if (!sol) {
    return (
      <NaoEncontrado
        texto={`Solicitação ${solId} não encontrada no ${HOSPITAIS[hospitalId].sigla}. Ela pode ser do outro hospital ou ter sido excluída.`}
        voltarPara="/ocs/solicitacoes"
        voltarRotulo="Voltar para Solicitações"
      />
    )
  }

  const s = sol
  const dp = parseDMY(s.data)
  const st = statusPrazo(dp, s.sit)
  const limite = dp ? addDias(dp, PRAZO) : null
  const primeiraOC = ocs
    .map((l) => parseDMY(l.oc.dataSolic))
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime())[0]
  const cicloInterno = dp && primeiraOC ? diasEntre(dp, primeiraOC) : null
  const abertas = ocs.filter((l) => l.aberta).length

  const handleSituacao = async (sit: string) => {
    try {
      await atualizarSituacao.mutateAsync({ id: s.id, sit })
      toast.show(`Solicitação ${s.id}: ${sit}`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao atualizar situação', 'error')
    }
  }

  const handleExcluir = async () => {
    try {
      await excluir.mutateAsync(s.id)
      desfazer(`Solicitação ${s.id} excluída`, 'sols', s.id, ['sols', hospitalId])
      navigate('/ocs/solicitacoes')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir solicitação', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link to="/ocs/solicitacoes" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Solicitações
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Solicitação {s.id}</h1>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEMAFORO_CLASS[st]}`}>{textoSemaforo(dp, s.sit)}</span>
            </div>
            <p className="mt-1 break-words text-sm text-slate-700">{s.produto || 'Produto não informado'}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{s.sit}</span>
              {s.motivo && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{s.motivo}</span>
                </>
              )}
              <span className="text-slate-300">·</span>
              <span>{HOSPITAIS[s.hospitalId].sigla}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Situação
              <select
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
                value={s.sit}
                onChange={(e) => void handleSituacao(e.target.value)}
                disabled={atualizarSituacao.isPending}
              >
                {SITUACOES_SOL.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
                {!(SITUACOES_SOL as readonly string[]).includes(s.sit) && <option value={s.sit}>{s.sit}</option>}
              </select>
            </label>
            <Button variant="outline" onClick={handleExcluir}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
            <Button onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </div>
        </div>
      </div>

      {/* Números-chave */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Destaque icone={<CalendarDays className="h-4 w-4" />} rotulo="Data da solicitação" valor={fmt(dp)} detalhe={s.solicitante || undefined} />
        <Destaque
          icone={<Clock className="h-4 w-4" />}
          rotulo="Prazo institucional"
          valor={limite ? fmt(limite) : ''}
          detalhe={limite ? `${PRAZO} dias da solicitação · ${textoSemaforo(dp, s.sit)}` : undefined}
        />
        <Destaque icone={<Hash className="h-4 w-4" />} rotulo="Quantidade" valor={s.qtd ? s.qtd.toLocaleString('pt-BR') : ''} />
        <Destaque
          icone={<Package className="h-4 w-4" />}
          rotulo="Ordens de compra"
          valor={ocs.length ? `${ocs.length} OC(s)` : 'Nenhuma ainda'}
          detalhe={ocs.length ? `${abertas} aberta(s)${cicloInterno !== null ? ` · 1ª OC em ${cicloInterno}d` : ''}` : 'sem OC vinculada'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Secao titulo={`Ordens de compra desta solicitação (${ocs.length})`}>
            {ocs.length === 0 ? (
              <p className="text-xs text-slate-400">
                Nenhuma OC vinculada. O vínculo vem do relatório de Acompanhamento de Compras (Importar) ou é feito na própria OC.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {ocs.map((l) => (
                  <li key={l.oc.id}>
                    <Link
                      to={`/ocs/ordens/${l.oc.id}`}
                      className="flex flex-col gap-1 py-2.5 hover:text-blue-700 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <span className="min-w-0">
                        <span className="font-mono text-sm font-semibold text-slate-800">OC {l.oc.id}</span>
                        <span className="ml-2 text-xs text-slate-500">{l.oc.fornecedorNome}</span>
                      </span>
                      <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{l.oc.sit}</span>
                        {l.oc.previsaoForn && !l.oc.dataEntregaReal && <span>prev. {l.oc.previsaoForn}</span>}
                        {l.oc.dataEntregaReal && <span>entregue {l.oc.dataEntregaReal}</span>}
                        <BadgePrazo linha={l} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
          <Secao titulo="Produto">
            <p className="whitespace-pre-line break-words text-sm text-slate-700">{s.produto || '—'}</p>
          </Secao>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Secao titulo="Parecer técnico">
            {parecer ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-slate-700">
                  Há parecer cadastrado para este produto (código <span className="font-mono">{parecer.cod}</span>).
                </p>
                {parecer.requisitoTecnico && (
                  <p className="rounded-md border border-status-amber/40 bg-status-amber-bg px-2 py-1 text-xs text-status-amber">
                    <span className="font-bold">Requisito:</span> {parecer.requisitoTecnico}
                  </p>
                )}
                <Link to={`/pareceres/base/${encodeURIComponent(parecer.cod)}`} className="text-xs font-medium text-blue-700 hover:underline">
                  Abrir parecer →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-2">
                <p className="text-xs text-slate-400">Nenhum parecer com este nome exato de produto.</p>
                <Button variant="ghost" onClick={() => navigate(`/pareceres?produto=${encodeURIComponent(s.produto)}`)}>
                  <Stethoscope className="h-3.5 w-3.5" /> Procurar parecer
                </Button>
              </div>
            )}
          </Secao>
          <Secao titulo="Detalhes">
            <dl className="grid grid-cols-2 gap-3">
              <Campo rotulo="Solicitante">{s.solicitante}</Campo>
              <Campo rotulo="Motivo">{s.motivo}</Campo>
              <Campo rotulo="Quantidade">{s.qtd || ''}</Campo>
              <Campo rotulo="Hospital">{HOSPITAIS[s.hospitalId].sigla}</Campo>
            </dl>
          </Secao>
        </aside>
      </div>

      {editando && <SolForm sol={s} hospitalId={hospitalId} onClose={() => setEditando(false)} />}
    </div>
  )
}
