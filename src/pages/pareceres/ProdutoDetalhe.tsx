import { ArrowLeft, ClipboardList, FileSignature, Pencil, Plus, Stethoscope, Tags } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ModalEditarParecer } from '@/components/pareceres/ModalEditarParecer'
import { ParecerCard } from '@/components/pareceres/ParecerCard'
import { Button } from '@/components/ui/Button'
import { Campo, Destaque, NaoEncontrado, Secao } from '@/components/ui/Detalhe'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { HOSPITAIS } from '@/constants'
import type { Produto } from '@/data/produtos'
import { useContratos, useProdutosContratadosPorCodigo } from '@/hooks/useContratos'
import { useHospital } from '@/hooks/useHospital'
import { useMarcasSugeridas } from '@/hooks/useMarcasSugeridas'
import { useOCs } from '@/hooks/useOCs'
import { usePareceres } from '@/hooks/usePareceres'
import { useProdutos } from '@/hooks/useProdutos'
import { useSols } from '@/hooks/useSols'
import { statusVigencia } from '@/utils/contrato'
import { temConteudoParecer } from '@/utils/marcas'
import { normalizarTexto } from '@/utils/produtos'

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const LIMITE_SOLS = 12

function dataISO(iso: string | null) {
  return iso ? iso.split('-').reverse().join('/') : ''
}

/**
 * Página do produto (item 106) — tudo sobre um código do SoulMV num lugar só:
 * o parecer técnico (marcas e requisito), os contratos que têm o produto e o
 * preço de cada um, e as solicitações/OCs com esse produto. Vale também para
 * produto sem parecer (dá pra cadastrar daqui).
 */
export default function ProdutoDetalhe() {
  const { cod = '' } = useParams<{ cod: string }>()
  const { hospitalId } = useHospital()
  const { data: produtos, isLoading: carregandoProdutos } = useProdutos()
  const { data: pareceres = [], isLoading: carregandoPareceres } = usePareceres()
  const { data: sugeridas = {} } = useMarcasSugeridas()
  const { data: itensContrato = [], error: erroContratos } = useProdutosContratadosPorCodigo(cod)
  const { data: contratos = [] } = useContratos(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: ocs = [] } = useOCs(hospitalId)
  const [editando, setEditando] = useState(false)

  const parecer = pareceres.find((p) => p.cod === cod) ?? null
  const produto = useMemo<Produto | null>(() => {
    const doParecer = pareceres.find((p) => p.cod === cod)
    return produtos?.find((p) => p.cod === cod) ?? (doParecer ? { cod: doParecer.cod, nome: doParecer.nome, cat: doParecer.cat } : null)
  }, [produtos, pareceres, cod])

  // Itens de contrato do hospital ativo, com o contrato junto; o menor preço entre os ativos fica marcado.
  const emContratos = useMemo(() => {
    const porId = new Map(contratos.map((c) => [c.id, c]))
    return itensContrato
      .flatMap((item) => {
        const c = porId.get(item.contratoId)
        return c ? [{ item, contrato: c, ativo: c.status === 'Ativo' && statusVigencia(c) !== 'vencido' }] : []
      })
      .sort((a, b) => Number(b.ativo) - Number(a.ativo) || (a.item.precoUnitario || Infinity) - (b.item.precoUnitario || Infinity))
  }, [itensContrato, contratos])
  const menorPreco = Math.min(...emContratos.filter((e) => e.ativo && e.item.precoUnitario > 0).map((e) => e.item.precoUnitario))
  const ativos = emContratos.filter((e) => e.ativo)

  // Solicitações com o mesmo nome do produto (a solicitação não traz o código) e as OCs delas.
  const doProduto = useMemo(() => {
    if (!produto) return { sols: [], ocsPorSol: new Map<number, number[]>() }
    const alvo = normalizarTexto(produto.nome)
    const lista = sols.filter((s) => normalizarTexto(s.produto) === alvo).sort((a, b) => b.id - a.id)
    const ids = new Set(lista.map((s) => s.id))
    const ocsPorSol = new Map<number, number[]>()
    for (const o of ocs) {
      if (o.solicitacaoId && ids.has(o.solicitacaoId)) ocsPorSol.set(o.solicitacaoId, [...(ocsPorSol.get(o.solicitacaoId) ?? []), o.id])
    }
    return { sols: lista, ocsPorSol }
  }, [produto, sols, ocs])

  if ((carregandoProdutos || carregandoPareceres) && !produto) return <SkeletonRows />
  if (!produto) {
    return (
      <NaoEncontrado
        texto={`Nenhum produto com o código ${cod} na base do SoulMV.`}
        voltarPara="/pareceres"
        voltarRotulo="Voltar para a consulta de produtos"
      />
    )
  }

  const temParecer = !!parecer && temConteudoParecer(parecer)
  const abertas = doProduto.sols.filter((s) => s.sit === 'Aberta' || s.sit === 'Parcialmente Atendida').length
  const totalOCs = [...doProduto.ocsPorSol.values()].reduce((n, l) => n + l.length, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link to="/pareceres" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Consultar produtos
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{produto.nome}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded bg-status-blue-bg px-2 py-0.5 font-mono font-bold text-status-blue">{produto.cod}</span>
              {produto.cat && <span>{produto.cat}</span>}
              <span className={`rounded-full px-2 py-0.5 font-semibold ${temParecer ? 'bg-status-green-bg text-status-green' : 'bg-status-amber-bg text-status-amber'}`}>
                {temParecer ? 'Com parecer' : 'Sem parecer'}
              </span>
              {ativos.length > 0 && <span className="rounded-full bg-status-blue-bg px-2 py-0.5 font-semibold text-status-blue">Em contrato</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {parecer && (
              <Link
                to={`/pareceres/base/${encodeURIComponent(parecer.cod)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              >
                <Stethoscope className="h-4 w-4" /> Página do parecer
              </Link>
            )}
            <Button onClick={() => setEditando(true)}>
              {parecer ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {parecer ? 'Editar parecer' : 'Cadastrar parecer'}
            </Button>
          </div>
        </div>
      </div>

      {/* Números-chave */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Destaque
          icone={<Stethoscope className="h-4 w-4" />}
          rotulo="Parecer técnico"
          valor={temParecer ? (parecer?.dataParecer ? `de ${parecer.dataParecer}` : 'Cadastrado') : 'Não cadastrado'}
          detalhe={parecer?.responsavel || (temParecer ? undefined : 'qualquer marca, sem avaliação')}
        />
        <Destaque
          icone={<Tags className="h-4 w-4" />}
          rotulo="Marca padrão"
          valor={parecer?.padrao.length ? parecer.padrao.join(', ') : parecer?.requisitoTecnico ? 'Requisito técnico' : 'Nenhuma'}
          detalhe={parecer?.proibidas.length ? `${parecer.proibidas.length} proibida(s)` : undefined}
        />
        <Destaque
          icone={<FileSignature className="h-4 w-4" />}
          rotulo="Contratos"
          valor={ativos.length ? `${ativos.length} ativo(s)` : 'Nenhum ativo'}
          detalhe={Number.isFinite(menorPreco) ? `menor preço ${MOEDA.format(menorPreco)}` : 'compra avulsa'}
        />
        <Destaque
          icone={<ClipboardList className="h-4 w-4" />}
          rotulo={`Solicitações (${HOSPITAIS[hospitalId].sigla})`}
          valor={`${doProduto.sols.length}`}
          detalhe={`${abertas} em aberto · ${totalOCs} OC(s)`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <ParecerCard produto={produto} parecer={parecer} marcasSugeridas={sugeridas[produto.cat] ?? []} />

          <Secao titulo={`Contratos com este produto (${emContratos.length})`}>
            {erroContratos ? (
              <p className="text-xs text-status-red">Erro ao buscar contratos: {erroContratos.message}</p>
            ) : emContratos.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum contrato do {HOSPITAIS[hospitalId].sigla} tem este código.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {emContratos.map(({ item, contrato, ativo }) => {
                  const melhor = ativo && item.precoUnitario > 0 && item.precoUnitario === menorPreco && ativos.length > 1
                  return (
                    <li key={item.id}>
                      <Link to={`/contratos/${contrato.id}?aba=produtos`} className="flex flex-col gap-1 py-2.5 hover:text-blue-700 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-800">{contrato.titulo || contrato.fornecedorNome}</span>
                          <span className="block text-xs text-slate-500">
                            {contrato.titulo ? `${contrato.fornecedorNome} · ` : ''}
                            {contrato.status}
                            {contrato.vigenciaFim ? ` · até ${dataISO(contrato.vigenciaFim)}` : ''}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-slate-500">
                          {melhor && <span className="rounded-full bg-status-green-bg px-2 py-0.5 font-semibold text-status-green">menor preço</span>}
                          <span className={`text-sm font-semibold ${ativo ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                            {item.precoUnitario > 0 ? MOEDA.format(item.precoUnitario) : 'sem preço'}
                          </span>
                          <span>/ {item.unidade.toLowerCase()}</span>
                          {item.moq ? <span>mín. {item.moq}</span> : null}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Secao>

          <Secao titulo={`Solicitações e OCs deste produto (${doProduto.sols.length})`}>
            {doProduto.sols.length === 0 ? (
              <p className="text-xs text-slate-400">
                Nenhuma solicitação com este nome de produto no {HOSPITAIS[hospitalId].sigla}. A solicitação do SoulMV não traz o código — o casamento é pelo nome.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {doProduto.sols.slice(0, LIMITE_SOLS).map((s) => (
                  <li key={s.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <Link to={`/ocs/solicitacoes/${s.id}`} className="text-sm hover:text-blue-700">
                      <span className="font-mono font-semibold text-slate-800">Sol. {s.id}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {s.data ?? ''} · {s.qtd ? `${s.qtd} un. · ` : ''}
                        {s.sit}
                      </span>
                    </Link>
                    <span className="flex flex-wrap gap-1">
                      {(doProduto.ocsPorSol.get(s.id) ?? []).map((id) => (
                        <Link key={id} to={`/ocs/ordens/${id}`} className="rounded-full bg-status-blue-bg px-1.5 py-0.5 font-mono text-[10px] font-semibold text-status-blue hover:underline">
                          OC {id}
                        </Link>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Secao titulo="Detalhes">
            <dl className="flex flex-col gap-3">
              <Campo rotulo="Código SoulMV">{produto.cod}</Campo>
              <Campo rotulo="Categoria">{produto.cat}</Campo>
              <Campo rotulo="Requisito técnico">{parecer?.requisitoTecnico ?? ''}</Campo>
            </dl>
          </Secao>
          <Secao titulo={`Marcas sugeridas para ${produto.cat || 'a categoria'}`}>
            {(sugeridas[produto.cat] ?? []).length ? (
              <div className="flex flex-wrap gap-1">
                {(sugeridas[produto.cat] ?? []).map((m) => (
                  <span key={m} className="rounded bg-status-purple-bg px-1.5 py-0.5 text-[11px] text-status-purple">
                    {m}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Nenhuma sugestão cadastrada para esta categoria.</p>
            )}
          </Secao>
        </aside>
      </div>

      {editando && <ModalEditarParecer parecer={parecer} produto={produto} onClose={() => setEditando(false)} />}
    </div>
  )
}
