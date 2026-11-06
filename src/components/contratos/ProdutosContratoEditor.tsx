import { useEffect, useMemo, useRef, useState } from 'react'
import { ProdutoAutocompleteInput } from '@/components/contratos/ProdutoAutocompleteInput'
import { IconButton } from '@/components/ui/IconButton'
import { CAPACIDADE_PERIODOS, UNIDADES_PRODUTO, type CapacidadePeriodo } from '@/constants'
import type { Produto } from '@/data/produtos'
import { useProdutos } from '@/hooks/useProdutos'
import { useToast } from '@/hooks/useToast'
import type { ContratoProduto } from '@/types'
import { PrecoInput } from '@/components/contratos/PrecoInput'
import { campoClass, rotuloClass } from '@/components/contratos/estilos'
import { lerListaColada, parsePrecoBR } from '@/utils/contrato'

interface ProdutosContratoEditorProps {
  contratoId: string
  produtos: ContratoProduto[]
  onChange: (produtos: ContratoProduto[]) => void
}

function novoProduto(contratoId: string, base: Partial<ContratoProduto> = {}): ContratoProduto {
  return {
    id: crypto.randomUUID(),
    contratoId,
    sku: '',
    descricao: '',
    codSoulmv: '',
    precoUnitario: 0,
    unidade: 'UNIDADE',
    moq: null,
    capacidadeFornecimento: null,
    capacidadePeriodo: 'mes',
    meioPagamento: '',
    ...base,
  }
}


function inteiroOuNull(texto: string): number | null {
  const n = parseInt(texto.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

type CampoEmMassa = 'precoUnitario' | 'unidade' | 'meioPagamento'

const CAMPOS_EM_MASSA: { id: CampoEmMassa; label: string }[] = [
  { id: 'precoUnitario', label: 'Preço unitário' },
  { id: 'unidade', label: 'Unidade' },
  { id: 'meioPagamento', label: 'Pagamento' },
]

function normalizar(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function ProdutosContratoEditor({ contratoId, produtos, onChange }: ProdutosContratoEditorProps) {
  const toast = useToast()
  const { data: catalogo = [] } = useProdutos()
  const porCod = useMemo(() => new Map(catalogo.map((p) => [p.cod, p])), [catalogo])
  const [busca, setBusca] = useState('')
  const [focoId, setFocoId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')
  const [painel, setPainel] = useState<'colar' | 'massa' | null>(null)
  const buscaRef = useRef<HTMLDivElement>(null)

  const atualizar = <K extends keyof ContratoProduto>(id: string, key: K, value: ContratoProduto[K]) =>
    onChange(produtos.map((p) => (p.id === id ? { ...p, [key]: value } : p)))

  const adicionarDoCatalogo = (item: Produto) => {
    setBusca('')
    if (produtos.some((p) => p.codSoulmv === item.cod)) {
      toast.show(`${item.cod} · ${item.nome} já está neste contrato`, 'warn')
      return
    }
    const novo = novoProduto(contratoId, { codSoulmv: item.cod, descricao: item.nome })
    onChange([...produtos, novo])
    setFiltro('')
    setFocoId(novo.id)
  }

  const adicionarManual = () => {
    const novo = novoProduto(contratoId)
    onChange([...produtos, novo])
    setFiltro('')
    setFocoId(novo.id)
  }

  const vincularCatalogo = (id: string, item: Produto) =>
    onChange(produtos.map((p) => (p.id === id ? { ...p, codSoulmv: item.cod, descricao: item.nome } : p)))

  const adicionarLista = (texto: string) => {
    const lidos = lerListaColada(texto)
    const jaTem = new Set(produtos.map((p) => p.codSoulmv))
    const novos: ContratoProduto[] = []
    const repetidos: string[] = []
    const desconhecidos: string[] = []
    for (const { cod, preco } of lidos) {
      const item = porCod.get(cod)
      if (!item) desconhecidos.push(cod)
      else if (jaTem.has(cod)) repetidos.push(cod)
      else novos.push(novoProduto(contratoId, { codSoulmv: cod, descricao: item.nome, precoUnitario: preco ?? 0 }))
    }
    if (novos.length) onChange([...produtos, ...novos])
    const partes = [
      `${novos.length} item(ns) adicionado(s)`,
      repetidos.length ? `${repetidos.length} já estavam no contrato` : '',
      desconhecidos.length ? `não encontrados no catálogo: ${desconhecidos.slice(0, 8).join(', ')}${desconhecidos.length > 8 ? '…' : ''}` : '',
    ].filter(Boolean)
    toast.show(partes.join(' · '), desconhecidos.length || !novos.length ? 'warn' : 'info')
    return novos.length > 0
  }

  const semPreco = produtos.filter((p) => p.descricao.trim() && !p.precoUnitario).length
  const termos = normalizar(filtro).split(/\s+/).filter(Boolean)
  const visiveis = termos.length
    ? produtos.filter((p) => termos.every((t) => normalizar(`${p.codSoulmv} ${p.descricao} ${p.sku}`).includes(t)))
    : produtos

  const aplicarEmMassa = (campo: CampoEmMassa, valor: string | number) => {
    const ids = new Set(visiveis.map((p) => p.id))
    onChange(produtos.map((p) => (ids.has(p.id) ? { ...p, [campo]: valor } : p)))
    toast.show(`${CAMPOS_EM_MASSA.find((c) => c.id === campo)?.label} aplicado em ${ids.size} item(ns)`)
    setPainel(null)
  }

  const botao = (ativo: boolean) =>
    `inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
      ativo ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
    }`

  return (
    <section>
      {/* Barra fixa no topo da área rolável do formulário enquanto a lista de produtos estiver na tela —
          buscar/adicionar sem precisar rolar de volta (pedido do Everton, contrato com 53 itens). */}
      <div ref={buscaRef} className="sticky -top-4 z-10 -mx-5 mb-3 border-b border-slate-200 bg-white/95 px-5 pb-3 pt-4 backdrop-blur-sm">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Produtos do contrato</h4>
            <p className="mt-0.5 text-xs text-slate-500">
              {produtos.length === 0 ? 'Nenhum item ainda' : `${produtos.length} ${produtos.length === 1 ? 'item' : 'itens'}`}
              {semPreco > 0 && <span className="ml-2 text-status-amber">· {semPreco} sem preço</span>}
              {termos.length > 0 && <span className="ml-2 text-blue-700">· mostrando {visiveis.length}</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={botao(painel === 'colar')} onClick={() => setPainel((v) => (v === 'colar' ? null : 'colar'))}>
              📋 Colar lista de códigos
            </button>
            {produtos.length > 1 && (
              <button type="button" className={botao(painel === 'massa')} onClick={() => setPainel((v) => (v === 'massa' ? null : 'massa'))}>
                ⇣ Preencher em todos
              </button>
            )}
            <button type="button" className={botao(false)} onClick={adicionarManual}>
              + Item fora do catálogo
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
            <ProdutoAutocompleteInput
              value={busca}
              onChange={setBusca}
              onSelect={adicionarDoCatalogo}
              minimo={1}
              ariaLabel="Adicionar produto do catálogo SoulMV"
              placeholder="Adicionar do catálogo SoulMV — código ou nome (ex.: 2868, fio ethibond)"
              className={`${campoClass} py-2 pl-9`}
            />
          </div>
          {produtos.length > 5 && (
            <input
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar itens deste contrato…"
              aria-label="Filtrar itens deste contrato"
              className={`${campoClass} py-2 sm:max-w-[16rem]`}
            />
          )}
        </div>

        {painel === 'colar' && <PainelColar onAdicionar={adicionarLista} onFechar={() => setPainel(null)} />}
        {painel === 'massa' && (
          <PainelEmMassa total={visiveis.length} filtrado={termos.length > 0} onAplicar={aplicarEmMassa} onFechar={() => setPainel(null)} />
        )}
      </div>

      {produtos.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-600">Busque um produto acima pra adicionar ao contrato</p>
          <p className="mt-1 text-xs text-slate-400">
            Ou cole de uma vez a lista de códigos (e preços) da proposta do fornecedor em "Colar lista de códigos".
          </p>
        </div>
      ) : visiveis.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Nenhum item deste contrato bate com "{filtro}".</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visiveis.map((p) => (
            <ItemProduto
              key={p.id}
              indice={produtos.indexOf(p) + 1}
              produto={p}
              doCatalogo={!!p.codSoulmv && porCod.has(p.codSoulmv)}
              focar={focoId === p.id}
              onFocado={() => setFocoId(null)}
              onCampo={(key, value) => atualizar(p.id, key, value)}
              onVincular={(item) => vincularCatalogo(p.id, item)}
              onRemover={() => onChange(produtos.filter((x) => x.id !== p.id))}
            />
          ))}
        </ul>
      )}

      {produtos.length > 3 && (
        <button
          type="button"
          onClick={() => buscaRef.current?.querySelector('input')?.focus()}
          className="mt-2 w-full rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-blue-300 hover:text-blue-700"
        >
          + Adicionar outro produto
        </button>
      )}
    </section>
  )
}

function PainelColar({ onAdicionar, onFechar }: { onAdicionar: (texto: string) => boolean; onFechar: () => void }) {
  const [texto, setTexto] = useState('')
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs text-slate-600">
        Cole os códigos SoulMV — um por linha ou separados por vírgula. Pode ter o preço no fim da linha, com centavos
        (ex.: <span className="font-mono">16874 700,00</span>). Funciona com colunas copiadas do Excel.
      </p>
      <textarea
        autoFocus
        rows={5}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className={`${campoClass} font-mono text-xs`}
        placeholder={'16874 700,00\n16876 700,00\n2868'}
      />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" className="text-xs text-slate-500 hover:underline" onClick={onFechar}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={!texto.trim()}
          onClick={() => {
            if (onAdicionar(texto)) {
              setTexto('')
              onFechar()
            }
          }}
          className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          Adicionar itens
        </button>
      </div>
    </div>
  )
}

function PainelEmMassa({
  total,
  filtrado,
  onAplicar,
  onFechar,
}: {
  total: number
  filtrado: boolean
  onAplicar: (campo: CampoEmMassa, valor: string | number) => void
  onFechar: () => void
}) {
  const [campo, setCampo] = useState<CampoEmMassa>('meioPagamento')
  const [texto, setTexto] = useState('')
  const [unidade, setUnidade] = useState<string>(UNIDADES_PRODUTO[0])
  const valor = campo === 'unidade' ? unidade : campo === 'precoUnitario' ? parsePrecoBR(texto) : texto.trim()
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div>
        <label className={rotuloClass}>Campo</label>
        <select className={campoClass} value={campo} onChange={(e) => setCampo(e.target.value as CampoEmMassa)}>
          {CAMPOS_EM_MASSA.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[10rem] flex-1">
        <label className={rotuloClass}>Valor</label>
        {campo === 'unidade' ? (
          <select className={campoClass} value={unidade} onChange={(e) => setUnidade(e.target.value)}>
            {UNIDADES_PRODUTO.map((u) => (
              <option key={u} value={u}>
                {u.charAt(0) + u.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        ) : (
          <input
            autoFocus
            className={campoClass}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={campo === 'precoUnitario' ? '700,00' : 'Ex.: boleto 28 dias'}
          />
        )}
      </div>
      <button
        type="button"
        disabled={campo !== 'unidade' && !valor}
        onClick={() => onAplicar(campo, valor)}
        className="rounded-md bg-blue-700 px-3 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        Aplicar em {total} {filtrado ? 'item(ns) filtrado(s)' : 'item(ns)'}
      </button>
      <button type="button" className="py-2 text-xs text-slate-500 hover:underline" onClick={onFechar}>
        Cancelar
      </button>
    </div>
  )
}

interface ItemProdutoProps {
  indice: number
  produto: ContratoProduto
  doCatalogo: boolean
  focar: boolean
  onFocado: () => void
  onCampo: <K extends keyof ContratoProduto>(key: K, value: ContratoProduto[K]) => void
  onVincular: (item: Produto) => void
  onRemover: () => void
}

function ItemProduto({ indice, produto: p, doCatalogo, focar, onFocado, onCampo, onVincular, onRemover }: ItemProdutoProps) {
  const cardRef = useRef<HTMLLIElement>(null)
  const precoRef = useRef<HTMLInputElement>(null)
  const [editando, setEditando] = useState(false)
  const descricaoVazia = !p.descricao.trim()
  const modoLeitura = doCatalogo && !editando
  const selecionarDoCatalogo = (item: Produto) => {
    onVincular(item)
    setEditando(false)
  }

  useEffect(() => {
    if (!focar) return
    cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    if (doCatalogo) precoRef.current?.focus()
    onFocado()
  }, [focar, doCatalogo, onFocado])

  const unidadeCustom = p.unidade && !(UNIDADES_PRODUTO as readonly string[]).includes(p.unidade)
  const extrasPreenchidos = [p.moq, p.capacidadeFornecimento, p.sku.trim() || null].filter((v) => v !== null && v !== '').length
  const [mais, setMais] = useState<boolean | null>(null)
  const mostrarMais = mais ?? extrasPreenchidos > 0

  return (
    <li
      ref={cardRef}
      className="rounded-lg border border-slate-200 bg-white p-3 shadow-soft-sm transition-colors hover:border-slate-300"
    >
      {/* Identificação */}
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
          {indice}
        </span>
        <div className="min-w-0 flex-1">
          {modoLeitura ? (
            <>
              <p className="text-sm font-semibold leading-snug text-slate-800">{p.descricao}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">SoulMV {p.codSoulmv}</span>
                <span className="rounded bg-status-green-bg px-1.5 py-0.5 font-medium text-status-green">Catálogo</span>
                <button
                  type="button"
                  className="text-slate-400 hover:text-blue-600 hover:underline"
                  onClick={() => setEditando(true)}
                  title="Editar código/descrição deste item"
                >
                  alterar
                </button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[7rem_1fr]">
              <div>
                <label className={rotuloClass}>Cód. SoulMV</label>
                <ProdutoAutocompleteInput
                  className={`${campoClass} font-mono`}
                  value={p.codSoulmv}
                  onChange={(v) => onCampo('codSoulmv', v)}
                  onSelect={selecionarDoCatalogo}
                  minimo={3}
                  ariaLabel="Código SoulMV"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className={rotuloClass}>
                  Descrição <span className="text-status-red">*</span>
                </label>
                <ProdutoAutocompleteInput
                  className={`${campoClass} ${descricaoVazia ? 'border-status-amber' : ''}`}
                  value={p.descricao}
                  onChange={(v) => onCampo('descricao', v)}
                  onSelect={selecionarDoCatalogo}
                  minimo={2}
                  ariaLabel="Descrição do produto"
                  placeholder="Nome do produto (busca no catálogo enquanto digita)"
                />
              </div>
            </div>
          )}
        </div>
        <IconButton title="Remover item" tone="danger" onClick={onRemover} className="mt-0.5 shrink-0">
          ✕
        </IconButton>
      </div>

      {/* Condições do item — as mais usadas sempre à vista; o resto atrás de "mais condições" pra lista longa ficar curta. */}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 sm:ml-9 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
        <div>
          <label className={rotuloClass}>Preço unitário</label>
          <PrecoInput valor={p.precoUnitario} onChange={(v) => onCampo('precoUnitario', v)} inputRef={precoRef} />
        </div>
        <div>
          <label className={rotuloClass}>Unidade</label>
          <select className={campoClass} value={p.unidade} onChange={(e) => onCampo('unidade', e.target.value)}>
            {unidadeCustom && <option value={p.unidade}>{p.unidade}</option>}
            {UNIDADES_PRODUTO.map((u) => (
              <option key={u} value={u}>
                {u.charAt(0) + u.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={rotuloClass}>Pagamento</label>
          <input
            type="text"
            className={campoClass}
            placeholder="Ex.: boleto 28d"
            value={p.meioPagamento}
            onChange={(e) => onCampo('meioPagamento', e.target.value)}
          />
        </div>
        <div className="col-span-2 flex items-end sm:col-span-1">
          <button
            type="button"
            onClick={() => setMais(!mostrarMais)}
            className="whitespace-nowrap py-1.5 text-xs font-medium text-slate-500 hover:text-blue-700"
            aria-expanded={mostrarMais}
          >
            {mostrarMais ? '− menos' : `+ mais condições${extrasPreenchidos ? ` (${extrasPreenchidos})` : ''}`}
          </button>
        </div>
      </div>
      {mostrarMais && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 sm:ml-9 sm:grid-cols-3">
        <div>
          <label className={rotuloClass} title="Quantidade mínima de pedido">
            Pedido mínimo
          </label>
          <input
            type="text"
            inputMode="numeric"
            className={`${campoClass} tabular-nums`}
            placeholder="—"
            value={p.moq ?? ''}
            onChange={(e) => onCampo('moq', inteiroOuNull(e.target.value))}
          />
        </div>
        <div>
          <label className={rotuloClass}>Capacidade máx.</label>
          <div className="flex">
            <input
              type="text"
              inputMode="numeric"
              className={`${campoClass} min-w-0 rounded-r-none tabular-nums`}
              placeholder="—"
              value={p.capacidadeFornecimento ?? ''}
              onChange={(e) => onCampo('capacidadeFornecimento', inteiroOuNull(e.target.value))}
            />
            <select
              className="rounded-r-md border border-l-0 border-slate-300 bg-slate-50 px-1.5 text-xs text-slate-600 focus:outline-none"
              value={p.capacidadePeriodo}
              onChange={(e) => onCampo('capacidadePeriodo', e.target.value as CapacidadePeriodo)}
              aria-label="Período da capacidade"
            >
              {CAPACIDADE_PERIODOS.map((per) => (
                <option key={per} value={per}>
                  {per === 'mes' ? '/mês' : '/sem'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={rotuloClass}>SKU interno</label>
          <input
            type="text"
            className={campoClass}
            placeholder="Opcional"
            value={p.sku}
            onChange={(e) => onCampo('sku', e.target.value)}
          />
        </div>
        </div>
      )}
    </li>
  )
}
