import { useMemo, useState } from 'react'
import { useFornecedores } from '@/hooks/useFornecedores'
import type { Fornecedor } from '@/types'

interface SearchFornecedorProps {
  value: number | null
  onChange: (fornecedorId: number | null) => void
  placeholder?: string
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

/**
 * Busca de fornecedor com autocomplete — mesmo padrão de `SearchProduto.tsx`.
 * Necessário desde a importação do cadastro completo do SoulMV (item 41 do
 * backlog, 21/09/2026): um `<select>` nativo com ~4.446 fornecedores ficava
 * inutilizável (rolagem infinita pra achar um nome).
 */
export function SearchFornecedor({ value, onChange, placeholder }: SearchFornecedorProps) {
  const { data: fornecedores = [] } = useFornecedores()
  const selecionado = value ? (fornecedores.find((f) => f.id === value) ?? null) : null

  const [query, setQuery] = useState('')
  const [aberto, setAberto] = useState(false)

  const resultados = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (q.length < 1) return []
    const porId = /^\d+$/.test(q)
    return fornecedores
      .filter((f) => (porId ? String(f.id).startsWith(q) : f.nome.toUpperCase().includes(q)))
      .slice(0, 14)
  }, [fornecedores, query])

  const selecionar = (f: Fornecedor) => {
    setQuery('')
    setAberto(false)
    onChange(f.id)
  }

  const limpar = () => {
    setQuery('')
    setAberto(false)
    onChange(null)
  }

  return (
    <div className="relative">
      {selecionado && !aberto ? (
        <div className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
          <span className="flex-1 truncate">{selecionado.nome}</span>
          <button type="button" onClick={() => setAberto(true)} className="text-xs text-blue-700 hover:underline">
            trocar
          </button>
          <button type="button" onClick={limpar} title="Remover fornecedor" className="text-slate-400 hover:text-status-red">
            ✕
          </button>
        </div>
      ) : (
        <input
          type="text"
          placeholder={placeholder ?? 'Buscar fornecedor por nome ou ID...'}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setAberto(true)
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          autoFocus={!!selecionado}
        />
      )}
      {aberto && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-soft-lg">
          {query.trim().length < 1 ? (
            <div className="px-3 py-2 text-xs text-slate-400">Digite pra buscar entre os fornecedores...</div>
          ) : resultados.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">Nenhum fornecedor encontrado.</div>
          ) : (
            resultados.map((f) => (
              <button
                key={f.id}
                type="button"
                onMouseDown={() => selecionar(f)}
                className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
              >
                <span className="font-mono text-xs text-slate-400">{f.id}</span>
                <span className="text-slate-800">{destacar(f.nome, query)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
