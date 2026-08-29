import { useMemo, useState } from 'react'
import type { Produto } from '@/data/produtos'
import { useProdutos } from '@/hooks/useProdutos'

interface SearchProdutoProps {
  onSelect: (produto: Produto) => void
  placeholder?: string
  valorInicial?: string
}

function destacar(texto: string, termo: string) {
  if (!termo) return texto
  const idx = texto.toUpperCase().indexOf(termo.toUpperCase())
  if (idx < 0) return texto
  return (
    <>
      {texto.slice(0, idx)}
      <mark className="rounded-sm bg-blue-200 text-blue-800">{texto.slice(idx, idx + termo.length)}</mark>
      {texto.slice(idx + termo.length)}
    </>
  )
}

export function SearchProduto({ onSelect, placeholder, valorInicial = '' }: SearchProdutoProps) {
  const { data: produtos = [] } = useProdutos()
  const [query, setQuery] = useState(valorInicial)
  const [aberto, setAberto] = useState(false)

  const resultados = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (q.length < 1) return []
    const porCodigo = /^\d+$/.test(q)
    return produtos
      .filter((p) => (porCodigo ? p.cod.startsWith(q) : p.nome.includes(q) || p.cod.includes(q)))
      .slice(0, 14)
  }, [produtos, query])

  const selecionar = (p: Produto) => {
    setQuery(`${p.cod} · ${p.nome}`)
    setAberto(false)
    onSelect(p)
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder ?? 'Buscar por código ou nome do produto...'}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {aberto && resultados.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {resultados.map((p) => (
            <button
              key={p.cod}
              type="button"
              onMouseDown={() => selecionar(p)}
              className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
            >
              <span className="font-mono text-xs text-slate-400">{p.cod}</span>
              <span>
                <div className="text-slate-800">{destacar(p.nome, query)}</div>
                <div className="text-[11px] text-slate-400">{p.cat}</div>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
