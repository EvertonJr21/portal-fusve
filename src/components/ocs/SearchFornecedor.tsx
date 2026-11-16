import { FileSignature, History } from 'lucide-react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { useFornecedores } from '@/hooks/useFornecedores'
import type { Fornecedor } from '@/types'
import { normalizarTexto } from '@/utils/produtos'

interface SearchFornecedorProps {
  value: number | null
  onChange: (fornecedorId: number | null) => void
  placeholder?: string
  /** Quantas vezes cada fornecedor já foi usado (ex.: em OPMEs) — sobe na lista e aparece com o campo vazio. */
  uso?: Map<number, number>
  /** Rótulo do uso, ex.: "OPME". */
  rotuloUso?: string
  /** Fornecedores com contrato ativo — marcados na lista. */
  comContrato?: Set<number>
}

const LIMITE = 14
const LIMITE_SUGESTOES = 8

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

/** Nome com todas as palavras digitadas (sem acento), código começando pelo número, ou CNPJ com os dígitos. */
function casa(f: Fornecedor, termo: string): boolean {
  const digitos = termo.replace(/\D/g, '')
  if (digitos && digitos.length === termo.replace(/[\s./-]/g, '').length) {
    return String(f.id).startsWith(digitos) || (digitos.length >= 3 && (f.cnpj ?? '').replace(/\D/g, '').includes(digitos))
  }
  const alvo = normalizarTexto(f.nome)
  return normalizarTexto(termo)
    .split(' ')
    .every((p) => alvo.includes(p))
}

/**
 * Busca de fornecedor com autocomplete — mesmo padrão de `SearchProduto.tsx`.
 * Necessário desde a importação do cadastro completo do SoulMV (item 41 do
 * backlog, 21/09/2026): um `<select>` nativo com ~4.446 fornecedores ficava
 * inutilizável. Desde o item 109 também busca por CNPJ e põe primeiro os
 * fornecedores já usados (com o campo vazio, mostra os mais usados).
 */
export function SearchFornecedor({ value, onChange, placeholder, uso, rotuloUso = 'OPME', comContrato }: SearchFornecedorProps) {
  const { data: fornecedores = [] } = useFornecedores()
  const selecionado = value ? (fornecedores.find((f) => f.id === value) ?? null) : null

  const [query, setQuery] = useState('')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)

  const termo = query.trim()
  const resultados = useMemo(() => {
    const vezes = (f: Fornecedor) => uso?.get(f.id) ?? 0
    if (!termo) {
      if (!uso?.size) return []
      return fornecedores
        .filter((f) => vezes(f) > 0)
        .sort((a, b) => vezes(b) - vezes(a) || a.nome.localeCompare(b.nome))
        .slice(0, LIMITE_SUGESTOES)
    }
    const inicio = normalizarTexto(termo)
    return fornecedores
      .filter((f) => casa(f, termo))
      .map((f) => ({ f, peso: vezes(f) * 10 + (comContrato?.has(f.id) ? 5 : 0) + (normalizarTexto(f.nome).startsWith(inicio) ? 1 : 0) }))
      .sort((a, b) => b.peso - a.peso || a.f.nome.localeCompare(b.f.nome))
      .slice(0, LIMITE)
      .map((r) => r.f)
  }, [fornecedores, termo, uso, comContrato])

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

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!aberto || resultados.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAtivo((i) => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selecionar(resultados[Math.min(ativo, resultados.length - 1)])
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setAberto(false)
    }
  }

  return (
    <div className="relative">
      {selecionado && !aberto ? (
        <div className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
          <span className="min-w-0 flex-1">
            <span className="block truncate">{selecionado.nome}</span>
            {selecionado.cnpj && <span className="block truncate text-[11px] text-slate-400">{selecionado.cnpj}</span>}
          </span>
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
          placeholder={placeholder ?? 'Nome, código ou CNPJ do fornecedor'}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={query}
          autoComplete="off"
          role="combobox"
          aria-expanded={aberto}
          onChange={(e) => {
            setQuery(e.target.value)
            setAberto(true)
            setAtivo(0)
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          onKeyDown={onKeyDown}
          autoFocus={!!selecionado}
        />
      )}
      {aberto && (
        <div role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-soft-lg">
          {!termo && resultados.length > 0 && (
            <div className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Mais usados em {rotuloUso}</div>
          )}
          {!termo && resultados.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">Digite o nome, código ou CNPJ do fornecedor...</div>
          ) : termo && resultados.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">Nenhum fornecedor encontrado.</div>
          ) : (
            resultados.map((f, i) => {
              const vezes = uso?.get(f.id) ?? 0
              const contrato = comContrato?.has(f.id)
              return (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={i === ativo}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selecionar(f)
                  }}
                  onMouseEnter={() => setAtivo(i)}
                  className={`flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 ${i === ativo ? 'bg-slate-100' : ''}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-slate-800">{destacar(f.nome, termo)}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      <span>cód. {f.id}</span>
                      {f.cnpj && <span>{f.cnpj}</span>}
                      {vezes > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-blue-700">
                          <History className="h-3 w-3" /> {vezes} {rotuloUso}
                        </span>
                      )}
                      {contrato && (
                        <span className="inline-flex items-center gap-0.5 text-status-green">
                          <FileSignature className="h-3 w-3" /> contrato ativo
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
