import { abrirPdfGerado } from '@/utils/pdfDataUrl'
import {
  ArrowLeft,
  CalendarClock,
  CopyPlus,
  FileText,
  Gauge,
  Mail,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Printer,
  Search,
  Stethoscope,
  Trash2,
  Truck,
  Wallet,
  Wrench,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ContratoForm } from '@/components/contratos/ContratoForm'
import { StatusContratoBadge, VigenciaBadge } from '@/components/contratos/ContratoStatusBadge'
import { ClasseBadge } from '@/components/ocs/desempenho'
import { Button } from '@/components/ui/Button'
import { Campo, Destaque, Secao, Valor } from '@/components/ui/Detalhe'
import { HistoricoAlteracoes } from '@/components/ui/HistoricoAlteracoes'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { StatusDot } from '@/components/ui/StatusDot'
import { HOSPITAIS } from '@/constants'
import { useConfirm } from '@/hooks/useConfirm'
import {
  useAbrirPdfContrato,
  useContratoComodatos,
  useContratoProdutos,
  useContratos,
  useExcluirContrato,
  useRenovarContrato,
} from '@/hooks/useContratos'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { useDesfazer } from '@/hooks/useDesfazer'
import { useHospital } from '@/hooks/useHospital'
import { useToast } from '@/hooks/useToast'
import type { ContratoHeader } from '@/types'
import { diasParaVencer, formatarPrecoBR, marcosVigencia } from '@/utils/contrato'
import { fmt, getHoje } from '@/utils/date'
import {
  desempenhoPorFornecedor,
  formatarDias,
  formatarPct,
  ligarContratosFornecedores,
  STATUS_ENTREGA_INFO,
} from '@/utils/kpis'

type Aba = 'geral' | 'produtos' | 'comodatos' | 'entregas' | 'historico'

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function semAcento(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Valor ou um traço discreto, pra campo vazio não parecer erro. */

/** Datas-chave no topo (os CLMs aprendem que vigência escondida no fim da ficha some de vista). */
function DatasChave({ c }: { c: ContratoHeader }) {
  const hoje = getHoje()
  const m = marcosVigencia(c, hoje)
  const dias = diasParaVencer(c.vigenciaFim)
  const barra =
    dias === null ? 'bg-status-gray' : dias < 0 ? 'bg-status-red' : dias <= 30 ? 'bg-status-red' : dias <= c.avisoRenovacaoDias ? 'bg-status-amber' : 'bg-status-green'

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <CalendarClock className="h-4 w-4 text-slate-400" /> Vigência e datas-chave
        </h3>
        <VigenciaBadge contrato={c} />
      </div>
      {m.pctDecorrido !== null && (
        <div className="mb-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${barra}`} style={{ width: `${m.pctDecorrido}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {m.pctDecorrido}% do prazo decorrido · {m.duracaoDias} dias de vigência
          </div>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Campo rotulo="Início">{m.inicio ? fmt(m.inicio) : ''}</Campo>
        <Campo rotulo="Fim">{m.fim ? fmt(m.fim) : ''}</Campo>
        <Campo rotulo="Aviso de renovação">
          {m.avisoEm ? `${fmt(m.avisoEm)} (${c.avisoRenovacaoDias} dias antes)` : ''}
        </Campo>
        <Campo rotulo="Renovação">{c.renovacaoAutomatica ? 'Automática' : 'Manual'}</Campo>
      </dl>
    </section>
  )
}

function linkWhatsapp(numero: string) {
  const digitos = numero.replace(/\D/g, '')
  return digitos ? `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}` : null
}

/**
 * Página do contrato (item 102) — "explorar contrato": cabeçalho com as ações,
 * números-chave, vigência no topo e abas (visão geral, produtos, comodatos,
 * entregas do fornecedor, histórico). Editar continua no formulário de sempre.
 */
export default function ContratoDetalhe() {
  const { contratoId = '' } = useParams<{ contratoId: string }>()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { hospitalId } = useHospital()
  const { data: contratos = [], isLoading, isFetching, error } = useContratos(hospitalId)
  const contrato = contratos.find((c) => c.id === contratoId) ?? null
  const produtosQ = useContratoProdutos(contrato ? contrato.id : null)
  const comodatosQ = useContratoComodatos(contrato ? contrato.id : null)
  const { avaliacoes, forns, isLoading: carregandoEntregas } = useAvaliacoesEntrega()
  const abrirPdf = useAbrirPdfContrato()
  const renovar = useRenovarContrato(hospitalId)
  const excluir = useExcluirContrato(hospitalId)
  const confirmar = useConfirm()
  const desfazer = useDesfazer()
  const toast = useToast()

  const aba = (params.get('aba') as Aba | null) ?? 'geral'
  const trocarAba = (a: Aba) => {
    const p = new URLSearchParams(params)
    if (a === 'geral') p.delete('aba')
    else p.set('aba', a)
    setParams(p, { replace: true })
  }
  const [editando, setEditando] = useState(params.get('editar') === '1')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [gerandoResumo, setGerandoResumo] = useState(false)

  const entregas = useMemo(() => {
    if (!contrato) return null
    const fornId = ligarContratosFornecedores([contrato], forns).fornecedorDoContrato.get(contrato.id)
    if (fornId === undefined) return null
    const doForn = avaliacoes.filter((a) => a.oc.fornecedorId === fornId)
    const d = desempenhoPorFornecedor(doForn, forns)[0] ?? null
    const recentes = [...doForn].sort((a, b) => (b.dataOC?.getTime() ?? 0) - (a.dataOC?.getTime() ?? 0)).slice(0, 25)
    return { fornId, d, recentes, total: doForn.length }
  }, [contrato, avaliacoes, forns])

  const produtos = useMemo(() => produtosQ.data ?? [], [produtosQ.data])
  const comodatos = comodatosQ.data ?? []
  const produtosFiltrados = useMemo(() => {
    const termos = semAcento(buscaProduto).split(/\s+/).filter(Boolean)
    if (!termos.length) return produtos
    return produtos.filter((p) => {
      const alvo = semAcento(`${p.codSoulmv} ${p.descricao} ${p.sku}`)
      return termos.every((t) => alvo.includes(t))
    })
  }, [produtos, buscaProduto])
  const semPreco = produtos.filter((p) => !p.precoUnitario).length
  const valorComodatos = comodatos.reduce((s, c) => s + (c.valorEstimado ?? 0) * c.quantidade, 0)

  // Recém-criado (renovação): espera a lista recarregar antes de dizer que não existe.
  if (isLoading || (!contrato && isFetching)) return <SkeletonRows />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar o contrato: {error.message}</p>
  if (!contrato) {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <p className="text-sm text-slate-600">
          Contrato não encontrado no {HOSPITAIS[hospitalId].sigla}. Ele pode ser do outro hospital ou ter sido excluído.
        </p>
        <Link to="/contratos" className="text-sm font-medium text-blue-700 hover:underline">
          ← Voltar para a tabela mestre
        </Link>
      </div>
    )
  }

  const c = contrato
  const hospital = c.hospitalId === 'ambos' ? 'HUV e HMK' : HOSPITAIS[c.hospitalId].sigla
  const wpp = linkWhatsapp(c.contatoWhatsapp)

  const handleRenovar = async () => {
    if (
      !(await confirmar({
        message: `Criar a renovação de ${c.titulo ? `"${c.titulo}"` : c.fornecedorNome}? Um contrato novo "Em Negociação" é criado com os mesmos produtos e a vigência seguinte; o atual continua como está.`,
        confirmLabel: 'Criar renovação',
      }))
    )
      return
    try {
      const novo = await renovar.mutateAsync(c)
      toast.show('Renovação criada — ajuste vigência e preços')
      navigate(`/contratos/${novo.id}?editar=1`)
      setEditando(true)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao criar a renovação', 'error')
    }
  }

  const handleImprimir = async () => {
    setGerandoResumo(true)
    try {
      await abrirPdfGerado(async () => {
        const { gerarResumoContratoPDF } = await import('@/relatorios/contratos')
        return gerarResumoContratoPDF({ contrato: c, produtos, comodatos })
      }, `Resumo do contrato — ${c.titulo || c.fornecedorNome}`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao gerar o resumo', 'error')
    } finally {
      setGerandoResumo(false)
    }
  }

  const handleExcluir = async () => {
    try {
      await excluir.mutateAsync(c.id)
      desfazer(c.titulo ? `Contrato "${c.titulo}" excluído` : 'Contrato excluído', 'contratos', c.id, ['contratos', hospitalId])
      navigate('/contratos')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir contrato', 'error')
    }
  }

  const abas: { chave: Aba; rotulo: string; contagem?: number }[] = [
    { chave: 'geral', rotulo: 'Visão geral' },
    { chave: 'produtos', rotulo: 'Produtos', contagem: produtos.length },
    { chave: 'comodatos', rotulo: 'Comodatos', contagem: comodatos.length },
    { chave: 'entregas', rotulo: 'Entregas', contagem: entregas?.total },
    { chave: 'historico', rotulo: 'Histórico' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link to="/contratos" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Tabela mestre
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{c.titulo || c.fornecedorNome}</h1>
            {c.titulo && <p className="text-sm text-slate-600">{c.fornecedorNome}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <StatusContratoBadge status={c.status} />
              <VigenciaBadge contrato={c} />
              <span>{c.tipo}</span>
              <span className="text-slate-300">·</span>
              <span>{hospital}</span>
              {c.classificacao && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{c.classificacao}</span>
                </>
              )}
              {c.fornecedorCnpj && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono">{c.fornecedorCnpj}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.pdfPath && (
              <Button variant="outline" onClick={() => abrirPdf.mutate(c.pdfPath as string)}>
                <FileText className="h-4 w-4" /> Contrato assinado
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleImprimir}
              loading={gerandoResumo}
              disabled={produtosQ.isLoading || comodatosQ.isLoading}
              title="Resumo completo em PDF, pronto para imprimir ou enviar à gerência"
            >
              <Printer className="h-4 w-4" /> Imprimir resumo
            </Button>
            <Button variant="outline" onClick={handleRenovar}>
              <CopyPlus className="h-4 w-4" /> Renovar
            </Button>
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
        <Destaque
          icone={<Truck className="h-4 w-4" />}
          rotulo="Prazo de entrega"
          valor={c.prazoMedioDias !== null ? `${c.prazoMedioDias} dias` : ''}
          detalhe={[c.freteTipo && `Frete ${c.freteTipo}`, c.origemEmbarque].filter(Boolean).join(' · ')}
        />
        <Destaque icone={<Wallet className="h-4 w-4" />} rotulo="Pagamento" valor={c.condicaoPagamento} detalhe={c.reajusteRegra && `Reajuste: ${c.reajusteRegra}`} />
        <Destaque
          icone={<Package className="h-4 w-4" />}
          rotulo="Produtos"
          valor={produtosQ.isLoading ? '…' : `${produtos.length} item(ns)`}
          detalhe={semPreco ? `${semPreco} sem preço` : comodatos.length ? `${comodatos.length} equipamento(s) em comodato` : undefined}
        />
        <Destaque
          icone={<Gauge className="h-4 w-4" />}
          rotulo="Entregas do fornecedor"
          valor={
            carregandoEntregas ? '…' : entregas?.d ? (
              <span className="flex items-center gap-2">
                <ClasseBadge classe={entregas.d.classe} avaliadas={entregas.d.resumo.avaliadas} /> OTIF {formatarPct(entregas.d.resumo.otif)}
              </span>
            ) : (
              'Sem OCs avaliadas'
            )
          }
          detalhe={entregas?.d ? `Lead time ${formatarDias(entregas.d.resumo.leadTimeMediana)}` : undefined}
        />
      </div>

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {abas.map((a) => (
          <button
            key={a.chave}
            type="button"
            role="tab"
            aria-selected={aba === a.chave}
            onClick={() => trocarAba(a.chave)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              aba === a.chave ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {a.rotulo}
            {a.contagem !== undefined && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-500">{a.contagem}</span>
            )}
          </button>
        ))}
      </div>

      {aba === 'geral' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            <DatasChave c={c} />
            <Secao titulo="Logística">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Campo rotulo="Frete">{c.freteTipo}</Campo>
                <Campo rotulo="Prazo médio">{c.prazoMedioDias !== null ? `${c.prazoMedioDias} dias` : ''}</Campo>
                <Campo rotulo="Origem do embarque">{c.origemEmbarque}</Campo>
                <Campo rotulo="Tolerância de atraso">{c.toleranciaAtrasoDias !== null ? `${c.toleranciaAtrasoDias} dias` : ''}</Campo>
                <Campo rotulo="Horário de corte">{c.horarioCutoff}</Campo>
              </dl>
            </Secao>
            <Secao titulo="Condições comerciais">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Campo rotulo="Condição de pagamento">{c.condicaoPagamento}</Campo>
                <Campo rotulo="Reajuste">{c.reajusteRegra}</Campo>
                <Campo rotulo="Desconto por volume">{c.gatilhoDesconto}</Campo>
              </dl>
            </Secao>
            {c.observacoes && (
              <Secao titulo="Observações">
                <p className="whitespace-pre-line text-sm text-slate-700">{c.observacoes}</p>
              </Secao>
            )}
          </div>
          <aside className="flex min-w-0 flex-col gap-4">
            <Secao titulo="Fornecedor e contato">
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{c.fornecedorNome}</div>
                  {c.fornecedorCnpj && <div className="font-mono text-xs text-slate-500">{c.fornecedorCnpj}</div>}
                </div>
                {c.contatoNome || c.contatoEmail || c.contatoWhatsapp ? (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {c.contatoNome && <li className="text-slate-700">{c.contatoNome}</li>}
                    {c.contatoEmail && (
                      <li>
                        <a href={`mailto:${c.contatoEmail}`} className="inline-flex items-center gap-1.5 break-all text-blue-700 hover:underline">
                          <Mail className="h-3.5 w-3.5 shrink-0" /> {c.contatoEmail}
                        </a>
                      </li>
                    )}
                    {c.contatoWhatsapp && (
                      <li>
                        {wpp ? (
                          <a href={wpp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-blue-700 hover:underline">
                            <MessageCircle className="h-3.5 w-3.5" /> {c.contatoWhatsapp}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-700">
                            <Phone className="h-3.5 w-3.5" /> {c.contatoWhatsapp}
                          </span>
                        )}
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">Nenhum contato cadastrado.</p>
                )}
                {entregas && (
                  <Link to={`/ocs/fornecedores/${entregas.fornId}`} className="text-xs font-medium text-blue-700 hover:underline">
                    Ver página do fornecedor →
                  </Link>
                )}
              </div>
            </Secao>
            <Secao titulo="Documento">
              {c.pdfPath ? (
                <button
                  type="button"
                  onClick={() => abrirPdf.mutate(c.pdfPath as string)}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-slate-300 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 shrink-0 text-status-red" />
                  <span className="truncate text-slate-700">{c.pdfNome || 'Contrato assinado.pdf'}</span>
                </button>
              ) : (
                <p className="text-xs text-slate-400">
                  Sem PDF do contrato assinado.{' '}
                  <button type="button" onClick={() => setEditando(true)} className="font-medium text-blue-700 hover:underline">
                    Anexar
                  </button>
                </p>
              )}
            </Secao>
          </aside>
        </div>
      )}

      {aba === 'produtos' && (
        <section className="flex flex-col gap-3">
          {produtos.length > 5 && (
            <label className="flex max-w-md items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Filtrar por código ou descrição"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
          )}
          {produtosQ.isLoading ? (
            <SkeletonRows />
          ) : produtosQ.error ? (
            <p className="text-sm text-status-red">Erro ao carregar os produtos: {produtosQ.error.message}</p>
          ) : produtos.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Nenhum produto neste contrato.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Cód. SoulMV</th>
                    <th className="px-3 py-2 text-left">Descrição</th>
                    <th className="px-3 py-2 text-left">Unidade</th>
                    <th className="px-3 py-2 text-right">Preço unit.</th>
                    <th className="px-3 py-2 text-right">Pedido mín.</th>
                    <th className="px-3 py-2 text-right">Capacidade</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs text-slate-600"><Valor>{p.codSoulmv}</Valor></td>
                      <td className="min-w-[16rem] px-3 py-2 text-slate-800">
                        {p.descricao}
                        {p.sku && <div className="text-[11px] text-slate-400">SKU {p.sku}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600"><Valor>{p.unidade}</Valor></td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-medium">
                        {p.precoUnitario ? `R$ ${formatarPrecoBR(p.precoUnitario)}` : <span className="text-xs text-status-amber">sem preço</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-xs"><Valor>{p.moq ?? ''}</Valor></td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-xs">
                        <Valor>{p.capacidadeFornecimento ? `${p.capacidadeFornecimento}/${p.capacidadePeriodo === 'semana' ? 'semana' : 'mês'}` : ''}</Valor>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {p.codSoulmv && (
                          <Link
                            to={`/pareceres/produto/${encodeURIComponent(p.codSoulmv)}`}
                            title="Ver o produto: parecer técnico, outros contratos e solicitações"
                            className="inline-flex text-slate-400 hover:text-blue-700"
                          >
                            <Stethoscope className="h-4 w-4" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                  {produtosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">Nenhum produto com esse filtro.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {aba === 'comodatos' && (
        <section className="flex flex-col gap-3">
          {comodatosQ.error ? (
            <p className="text-sm text-slate-500">Comodatos indisponíveis: {comodatosQ.error.message}</p>
          ) : comodatosQ.isLoading ? (
            <SkeletonRows />
          ) : comodatos.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Nenhum equipamento em comodato neste contrato.</p>
          ) : (
            <>
              {valorComodatos > 0 && (
                <p className="text-xs text-slate-500">Valor estimado total: <strong className="text-slate-800">{MOEDA.format(valorComodatos)}</strong></p>
              )}
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {comodatos.map((e) => (
                  <li key={e.id} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                        <Wrench className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800">
                          {e.equipamento} {e.quantidade > 1 && <span className="text-slate-500">× {e.quantidade}</span>}
                        </div>
                        {e.fabricanteModelo && <div className="text-xs text-slate-500">{e.fabricanteModelo}</div>}
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      <Campo rotulo="Nº de série">{e.numeroSerie}</Campo>
                      <Campo rotulo="Patrimônio">{e.patrimonio}</Campo>
                      <Campo rotulo="Local">{e.localInstalacao}</Campo>
                      <Campo rotulo="Instalado em">{e.dataInstalacao ? fmt(new Date(`${e.dataInstalacao}T00:00:00`)) : ''}</Campo>
                      <Campo rotulo="Valor estimado">{e.valorEstimado ? MOEDA.format(e.valorEstimado) : ''}</Campo>
                    </dl>
                    {e.observacao && <p className="mt-2 text-xs text-slate-500">{e.observacao}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {aba === 'entregas' && (
        <section className="flex flex-col gap-3">
          {carregandoEntregas ? (
            <SkeletonRows />
          ) : !entregas ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Fornecedor não encontrado no cadastro do SoulMV pelo CNPJ nem pelo nome — sem OCs para comparar.
            </p>
          ) : entregas.total === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Nenhuma OC deste fornecedor no {HOSPITAIS[hospitalId].sigla}.</p>
          ) : (
            <>
              {entregas.d && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200/80 bg-white p-4 text-sm text-slate-600 shadow-soft-sm">
                  <ClasseBadge classe={entregas.d.classe} avaliadas={entregas.d.resumo.avaliadas} />
                  <span>OTIF <strong className="text-slate-800">{formatarPct(entregas.d.resumo.otif)}</strong></span>
                  <span>No prazo <strong className="text-slate-800">{formatarPct(entregas.d.resumo.onTime)}</strong></span>
                  <span>Lead time <strong className="text-slate-800">{formatarDias(entregas.d.resumo.leadTimeMediana)}</strong></span>
                  <span>{entregas.d.resumo.avaliadas} OC(s) avaliadas</span>
                  {entregas.d.resumo.abertasVencidas > 0 && (
                    <span className="text-status-red">{entregas.d.resumo.abertasVencidas} aberta(s) vencida(s)</span>
                  )}
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">OC</th>
                      <th className="px-3 py-2 text-left">Data da OC</th>
                      <th className="px-3 py-2 text-left">Prometida</th>
                      <th className="px-3 py-2 text-left">Entrega</th>
                      <th className="px-3 py-2 text-left">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entregas.recentes.map((a) => {
                      const st = STATUS_ENTREGA_INFO[a.status]
                      return (
                        <tr key={a.oc.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">
                            <Link to={`/ocs/ordens/${a.oc.id}`} className="font-mono text-xs font-semibold text-blue-700 hover:underline">
                              {a.oc.id}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-xs">{fmt(a.dataOC)}</td>
                          <td className="px-3 py-2 text-xs">{fmt(a.dataPrometida)}</td>
                          <td className="px-3 py-2 text-xs">{fmt(a.dataEntrega)}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                              <StatusDot tone={st.tone} label={st.label} /> {st.label}
                              {a.diasAtraso > 0 && <span className="text-status-red">(+{a.diasAtraso}d)</span>}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                <span>
                  {entregas.total > entregas.recentes.length
                    ? `Mostrando as ${entregas.recentes.length} OCs mais recentes de ${entregas.total}.`
                    : `${entregas.total} OC(s) deste fornecedor no ${HOSPITAIS[hospitalId].sigla}.`}
                </span>
                <Link to={`/ocs/fornecedores/${entregas.fornId}`} className="font-medium text-blue-700 hover:underline">
                  Ficha completa do fornecedor →
                </Link>
              </div>
            </>
          )}
        </section>
      )}

      {aba === 'historico' && (
        <Secao titulo="Alterações neste contrato">
          <HistoricoAlteracoes tabela="contratos" registroId={c.id} limite={100} />
        </Secao>
      )}

      {editando && (
        <ContratoForm
          contrato={c}
          hospitalIdPadrao={hospitalId}
          onClose={() => {
            setEditando(false)
            if (params.get('editar')) {
              const p = new URLSearchParams(params)
              p.delete('editar')
              setParams(p, { replace: true })
            }
          }}
        />
      )}
    </div>
  )
}
