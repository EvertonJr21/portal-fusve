import { useEffect, useMemo, useRef, useState } from 'react'
import { ProdutoAutocompleteInput } from '@/components/contratos/ProdutoAutocompleteInput'
import { IconButton } from '@/components/ui/IconButton'
import { CAPACIDADE_PERIODOS, UNIDADES_PRODUTO, type CapacidadePeriodo } from '@/constants'
import type { Produto } from '@/data/produtos'
import { useProdutos } from '@/hooks/useProdutos'
import { useToast } from '@/hooks/useToast'
import type { ContratoProduto } from '@/types'
import { formatarPrecoBR, parsePrecoBR } from '@/utils/contrato'

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

const campoClass =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
const rotuloClass = 'mb-1 block text-[11px] font-medium text-slate-500'

interface PrecoInputProps {
  valor: number
  onChange: (valor: number) => void
  inputRef?: React.Ref<HTMLInputElement>
}

/** Texto livre enquanto digita, formatado em R$ ao sair — evita o "0387,69" do input number. */
function PrecoInput({ valor, onChange, inputRef }: PrecoInputProps) {
  const [rascunho, setRascunho] = useState<string | null>(null)
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className={`${campoClass} pl-8 text-right tabular-nums`}
        placeholder="0,00"
        value={rascunho ?? formatarPrecoBR(valor)}
        onFocus={() => setRascunho(formatarPrecoBR(valor))}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={() => {
          if (rascunho !== null) onChange(parsePrecoBR(rascunho))
          setRascunho(null)
        }}
      />
    </div>
  )
}

function inteiroOuNull(texto: string): number | null {
  const n = parseInt(texto.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

export function ProdutosContratoEditor({ contratoId, produtos, onChange }: ProdutosContratoEditorProps) {
  const toast = useToast()
  const { data: catalogo = [] } = useProdutos()
  const codsCatalogo = useMemo(() => new Set(catalogo.map((p) => p.cod)), [catalogo])
  const [busca, setBusca] = useState('')
  const [focoId, setFocoId] = useState<string | null>(null)

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
    setFocoId(novo.id)
  }

  const adicionarManual = () => {
    const novo = novoProduto(contratoId)
    onChange([...produtos, novo])
    setFocoId(novo.id)
  }

  const vincularCatalogo = (id: string, item: Produto) =>
    onChange(produtos.map((p) => (p.id === id ? { ...p, codSoulmv: item.cod, descricao: item.nome } : p)))

  const semPreco = produtos.filter((p) => p.descricao.trim() && !p.precoUnitario).length

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Produtos do contrato</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            {produtos.length === 0
              ? 'Nenhum item ainda'
              : `${produtos.length} ${produtos.length === 1 ? 'item' : 'itens'}`}
            {semPreco > 0 && <span className="ml-2 text-status-amber">· {semPreco} sem preço</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={adicionarManual}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          + Item fora do catálogo
        </button>
      </div>

      <div className="relative mb-3">
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
          placeholder="Buscar no catálogo SoulMV por código ou nome (ex.: 2868, fio ethibond)"
          className={`${campoClass} py-2.5 pl-9`}
        />
      </div>

      {produtos.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-600">Busque um produto acima pra adicionar ao contrato</p>
          <p className="mt-1 text-xs text-slate-400">
            Cada item escolhido vira um cartão onde você preenche preço, unidade e condições.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {produtos.map((p, i) => (
            <ItemProduto
              key={p.id}
              indice={i + 1}
              produto={p}
              doCatalogo={!!p.codSoulmv && codsCatalogo.has(p.codSoulmv)}
              focar={focoId === p.id}
              onFocado={() => setFocoId(null)}
              onCampo={(key, value) => atualizar(p.id, key, value)}
              onVincular={(item) => vincularCatalogo(p.id, item)}
              onRemover={() => onChange(produtos.filter((x) => x.id !== p.id))}
            />
          ))}
        </ul>
      )}
    </section>
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

      {/* Condições do item */}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 sm:ml-9 sm:grid-cols-3 lg:grid-cols-6">
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
          <label className={rotuloClass}>Pagamento</label>
          <input
            type="text"
            className={campoClass}
            placeholder="Ex.: boleto 28d"
            value={p.meioPagamento}
            onChange={(e) => onCampo('meioPagamento', e.target.value)}
          />
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
    </li>
  )
}
