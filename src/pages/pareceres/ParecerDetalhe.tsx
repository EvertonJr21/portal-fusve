import { ArrowLeft, CalendarDays, FileDown, FileText, Paperclip, Pencil, Tags, Trash2, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ModalEditarParecer } from '@/components/pareceres/ModalEditarParecer'
import { Button } from '@/components/ui/Button'
import { Campo, Destaque, NaoEncontrado, Secao } from '@/components/ui/Detalhe'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useConfirm } from '@/hooks/useConfirm'
import { useHospital } from '@/hooks/useHospital'
import { useMarcasSugeridas } from '@/hooks/useMarcasSugeridas'
import { useAbrirAnexo, useAnexosParecer } from '@/hooks/useParecerAnexos'
import { useAbrirPdfParecer, useExcluirParecer, usePareceres } from '@/hooks/usePareceres'
import { useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import type { MarcaCategoria, ParecerAnexo } from '@/types'
import { CATEGORIAS_MARCA, rotuloValidade, temConteudoParecer, validadeParecer } from '@/utils/marcas'
import { normalizarTexto } from '@/utils/produtos'

const ESTILO_CATEGORIA: Record<MarcaCategoria, { borda: string; titulo: string; chip: string }> = {
  padrao: { borda: 'border-status-green/30', titulo: 'text-status-green', chip: 'bg-status-green-bg text-status-green' },
  permitidas: { borda: 'border-status-blue/30', titulo: 'text-status-blue', chip: 'bg-status-blue-bg text-status-blue' },
  restritas: { borda: 'border-status-amber/30', titulo: 'text-status-amber', chip: 'bg-status-amber-bg text-status-amber' },
  proibidas: { borda: 'border-status-red/30', titulo: 'text-status-red', chip: 'bg-status-red-bg text-status-red' },
}

const CLASSE_VALIDADE = { ok: 'bg-status-green-bg text-status-green', atencao: 'bg-status-amber-bg text-status-amber', revisar: 'bg-status-red-bg text-status-red' } as const

/**
 * Página do parecer técnico (item 105) — mesmo formato das outras páginas de
 * detalhe: marcas por categoria com os PDFs de cada marca à vista, requisito
 * técnico, validade, marcas sugeridas da categoria e solicitações do produto.
 */
export default function ParecerDetalhe() {
  const { cod: codParam = '' } = useParams<{ cod: string }>()
  const cod = codParam
  const navigate = useNavigate()
  const { hospitalId } = useHospital()
  const { data: pareceres = [], isLoading, isFetching, error } = usePareceres()
  const { data: anexos = [] } = useAnexosParecer(cod)
  const { data: sugeridas = {} } = useMarcasSugeridas()
  const { data: sols = [] } = useSols(hospitalId)
  const abrirAnexo = useAbrirAnexo()
  const abrirPdf = useAbrirPdfParecer()
  const excluir = useExcluirParecer()
  const confirmar = useConfirm()
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [gerando, setGerando] = useState(false)

  const parecer = pareceres.find((p) => p.cod === cod) ?? null

  const anexosPorMarca = useMemo(() => {
    const m = new Map<string, ParecerAnexo[]>()
    for (const a of anexos) {
      const k = `${a.categoria}|${a.marca}`
      m.set(k, [...(m.get(k) ?? []), a])
    }
    return m
  }, [anexos])

  const solsDoProduto = useMemo(() => {
    if (!parecer) return []
    const alvo = normalizarTexto(parecer.nome)
    return sols.filter((s) => normalizarTexto(s.produto) === alvo).sort((a, b) => b.id - a.id)
  }, [parecer, sols])

  if (isLoading || (!parecer && isFetching)) return <SkeletonRows />
  if (error) return <p className="text-sm text-status-red">Erro ao carregar o parecer: {error.message}</p>
  if (!parecer) {
    return (
      <NaoEncontrado
        texto={`Nenhum parecer cadastrado para o código ${cod}. Ele pode ter sido apagado.`}
        voltarPara="/pareceres/base"
        voltarRotulo="Voltar para a Base de Pareceres"
      />
    )
  }

  const p = parecer
  const validade = validadeParecer(p.dataParecer)
  const totalMarcas = CATEGORIAS_MARCA.reduce((n, c) => n + p[c.key].length, 0)
  const resumoMarcas = CATEGORIAS_MARCA.filter((c) => p[c.key].length)
    .map((c) => `${p[c.key].length} ${c.label.toLowerCase()}`)
    .join(' · ')
  const temPdfGeral = !!(p.pdfPath || p.pdfDataUrl)
  const marcasSugeridas = sugeridas[p.cat] ?? []

  const abrir = async (path: string) => {
    try {
      await abrirAnexo.abrir(path)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Não foi possível abrir o PDF', 'error')
    }
  }

  const exportar = async () => {
    setGerando(true)
    try {
      const { gerarRelatorioPDF } = await import('@/utils/relatorioParecer')
      gerarRelatorioPDF([p])
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao gerar PDF', 'error')
    } finally {
      setGerando(false)
    }
  }

  const handleExcluir = async () => {
    // Exclusão de parecer é definitiva (não tem "Desfazer") — por isso pede confirmação.
    if (!(await confirmar({ message: `Apagar o parecer de ${p.cod} — ${p.nome}? Essa ação não pode ser desfeita.`, tone: 'danger', confirmLabel: 'Apagar' })))
      return
    try {
      await excluir.mutateAsync(p.cod)
      toast.show('Parecer removido')
      navigate('/pareceres/base')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao apagar parecer', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link to="/pareceres/base" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Base de Pareceres
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{p.nome}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded bg-status-blue-bg px-2 py-0.5 font-mono font-bold text-status-blue">{p.cod}</span>
              {p.cat && <span>{p.cat}</span>}
              {validade && (
                <span className={`rounded-full px-2 py-0.5 font-semibold ${CLASSE_VALIDADE[validade.nivel]}`}>
                  {validade.nivel === 'revisar' ? 'Revisar parecer' : `Parecer de ${rotuloValidade(validade)} atrás`}
                </span>
              )}
              {!temConteudoParecer(p) && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">Sem marca nem requisito</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {temPdfGeral && (
              <Button variant="outline" onClick={() => void abrirPdf.abrir(p)} title="PDF geral do parecer — não vinculado a uma marca">
                <FileText className="h-4 w-4" /> PDF geral
              </Button>
            )}
            <Button variant="outline" onClick={exportar} loading={gerando}>
              <FileDown className="h-4 w-4" /> Relatório
            </Button>
            <Button variant="outline" onClick={handleExcluir}>
              <Trash2 className="h-4 w-4" /> Apagar
            </Button>
            <Button onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </div>
        </div>
      </div>

      {/* Números-chave */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Destaque icone={<User className="h-4 w-4" />} rotulo="Responsável" valor={p.responsavel} />
        <Destaque
          icone={<CalendarDays className="h-4 w-4" />}
          rotulo="Data do parecer"
          valor={p.dataParecer}
          detalhe={validade ? (validade.nivel === 'revisar' ? `${rotuloValidade(validade)}` : `há ${rotuloValidade(validade)}`) : undefined}
        />
        <Destaque icone={<Tags className="h-4 w-4" />} rotulo="Marcas avaliadas" valor={totalMarcas ? `${totalMarcas} marca(s)` : 'Nenhuma'} detalhe={resumoMarcas || 'vale o requisito técnico'} />
        <Destaque
          icone={<Paperclip className="h-4 w-4" />}
          rotulo="Documentos"
          valor={`${anexos.length + (temPdfGeral ? 1 : 0)} PDF(s)`}
          detalhe={`${anexos.length} por marca${temPdfGeral ? ' · 1 geral' : ''}`}
        />
      </div>

      {p.requisitoTecnico && (
        <div className="rounded-xl border border-status-amber/40 bg-status-amber-bg px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-status-amber">Requisito técnico de compra — vale pra qualquer marca</div>
          <p className="mt-1 whitespace-pre-line text-sm font-medium text-slate-800">{p.requisitoTecnico}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Secao titulo="Marcas">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CATEGORIAS_MARCA.map(({ key, label, descricao }) => {
                const estilo = ESTILO_CATEGORIA[key]
                return (
                  <div key={key} className={`rounded-lg border ${estilo.borda} p-3`}>
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <span className={`text-sm font-semibold ${estilo.titulo}`}>{label}</span>
                      <span className="text-[11px] text-slate-400">{descricao}</span>
                    </div>
                    {p[key].length === 0 ? (
                      <p className="text-xs text-slate-400">Nenhuma.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {p[key].map((marca) => {
                          const docs = anexosPorMarca.get(`${key}|${marca}`) ?? []
                          return (
                            <li key={marca} className="flex flex-col gap-1">
                              <span className={`w-fit rounded px-2 py-0.5 text-xs font-semibold ${estilo.chip}`}>{marca}</span>
                              {docs.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => void abrir(a.pdfPath)}
                                  title="Abrir PDF desta marca"
                                  className="flex min-w-0 items-center gap-1.5 pl-1 text-left text-xs text-blue-700 hover:underline"
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{a.nomeArquivo}</span>
                                </button>
                              ))}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
            {totalMarcas === 0 && p.requisitoTecnico && (
              <p className="mt-3 text-xs text-slate-500">Sem marca definida — qualquer marca serve, desde que atenda ao requisito técnico.</p>
            )}
          </Secao>
          <Secao titulo="Observação">
            {p.observacao ? (
              <p className="whitespace-pre-line text-sm text-slate-700">{p.observacao}</p>
            ) : (
              <p className="text-xs text-slate-400">Sem observação.</p>
            )}
          </Secao>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Secao titulo="Detalhes">
            <dl className="grid grid-cols-2 gap-3">
              <Campo rotulo="Código SoulMV">{p.cod}</Campo>
              <Campo rotulo="Categoria">{p.cat}</Campo>
              <Campo rotulo="Responsável">{p.responsavel}</Campo>
              <Campo rotulo="Data do parecer">{p.dataParecer}</Campo>
            </dl>
            <Link to={`/pareceres/produto/${encodeURIComponent(p.cod)}`} className="mt-3 inline-block text-xs font-medium text-blue-700 hover:underline">
              Página do produto: contratos, preços e solicitações →
            </Link>
          </Secao>
          <Secao titulo={`Marcas sugeridas para ${p.cat || 'a categoria'}`}>
            {marcasSugeridas.length ? (
              <div className="flex flex-wrap gap-1">
                {marcasSugeridas.map((m) => (
                  <span key={m} className="rounded bg-status-purple-bg px-1.5 py-0.5 text-[11px] text-status-purple">
                    {m}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Nenhuma sugestão cadastrada para esta categoria.</p>
            )}
            <Link to="/pareceres/marcas-sugeridas" className="mt-3 inline-block text-xs font-medium text-blue-700 hover:underline">
              Marcas sugeridas →
            </Link>
          </Secao>
          <Secao titulo={`Solicitações deste produto (${solsDoProduto.length})`}>
            {solsDoProduto.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma solicitação com este nome de produto no hospital ativo.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {solsDoProduto.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <Link to={`/ocs/solicitacoes/${s.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-blue-700">
                      <span className="font-mono font-medium text-slate-800">#{s.id}</span>
                      <span className="text-xs text-slate-500">
                        {s.data ?? ''} · {s.sit}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </aside>
      </div>

      {editando && <ModalEditarParecer parecer={p} onClose={() => setEditando(false)} />}
    </div>
  )
}
