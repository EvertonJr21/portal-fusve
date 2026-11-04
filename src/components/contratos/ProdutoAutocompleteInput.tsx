import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Produto } from '@/data/produtos'
import { useProdutos } from '@/hooks/useProdutos'
import { buscarProdutos } from '@/utils/produtos'

interface ProdutoAutocompleteInputProps {
  value: string
  /** Digitação livre — o campo continua aceitando texto que não está no catálogo. */
  onChange: (texto: string) => void
  onSelect: (produto: Produto) => void
  className?: string
  placeholder?: string
  /** Mínimo de caracteres pra abrir a lista (código costuma ter 4+, nome 2+). */
  minimo?: number
  ariaLabel?: string
}

interface Posicao {
  top?: number
  bottom?: number
  left: number
  width: number
}

/** Altura máxima da lista (`max-h-72` = 18rem). */
const ALTURA_LISTA = 288

function destacar(texto: string, termo: string) {
  const t = termo.trim().split(/\s+/)[0]
  if (!t) return texto
  const idx = texto.toUpperCase().indexOf(t.toUpperCase())
  if (idx < 0) return texto
  return (
    <>
      {texto.slice(0, idx)}
      <mark className="rounded-sm bg-blue-200 text-blue-800">{texto.slice(idx, idx + t.length)}</mark>
      {texto.slice(idx + t.length)}
    </>
  )
}

/**
 * Input com autocomplete do catálogo SoulMV pra usar dentro de tabelas/modais.
 *
 * A lista é renderizada via portal no `document.body` com posição fixa — dentro do
 * `ContratoForm` o input fica numa tabela com `overflow-x-auto` dentro do corpo
 * rolável do `Modal`, e um dropdown `absolute` comum seria cortado por esses dois
 * contêineres.
 */
export function ProdutoAutocompleteInput({
  value,
  onChange,
  onSelect,
  className,
  placeholder,
  minimo = 2,
  ariaLabel,
}: ProdutoAutocompleteInputProps) {
  const { data: produtos = [], isLoading } = useProdutos()
  const inputRef = useRef<HTMLInputElement>(null)
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const [pos, setPos] = useState<Posicao | null>(null)

  const termo = value.trim()
  const resultados = useMemo(
    () => (termo.length >= minimo ? buscarProdutos(produtos, termo, 12) : []),
    [produtos, termo, minimo],
  )
  const mostrar = aberto && termo.length >= minimo

  const atualizarPosicao = () => {
    const r = inputRef.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(Math.max(r.width, 360), window.innerWidth - 16)
    const left = Math.min(r.left, window.innerWidth - width - 8)
    const espacoAbaixo = window.innerHeight - r.bottom
    // Perto do rodapé do modal a lista abre pra cima, senão ficaria cortada pela tela
    if (espacoAbaixo < ALTURA_LISTA + 8 && r.top > espacoAbaixo) {
      setPos({ bottom: window.innerHeight - r.top + 4, left, width })
    } else {
      setPos({ top: r.bottom + 4, left, width })
    }
  }

  useLayoutEffect(() => {
    if (mostrar) atualizarPosicao()
  }, [mostrar, value])

  useEffect(() => {
    if (!mostrar) return
    window.addEventListener('scroll', atualizarPosicao, true)
    window.addEventListener('resize', atualizarPosicao)
    return () => {
      window.removeEventListener('scroll', atualizarPosicao, true)
      window.removeEventListener('resize', atualizarPosicao)
    }
  }, [mostrar])

  const selecionar = (p: Produto) => {
    onSelect(p)
    setAberto(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mostrar || resultados.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAtivo((i) => (i + 1) % resultados.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((i) => (i - 1 + resultados.length) % resultados.length)
    } else if (e.key === 'Enter') {
      // Sem isso o Enter submeteria o formulário do contrato inteiro
      e.preventDefault()
      selecionar(resultados[Math.min(ativo, resultados.length - 1)])
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setAberto(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        className={className}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={mostrar}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setAberto(true)
          setAtivo(0)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={handleKeyDown}
      />
      {mostrar &&
        pos &&
        createPortal(
          <div
            role="listbox"
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }}
            className="fixed z-[60] max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white text-sm shadow-soft-lg"
          >
            {isLoading && <div className="px-3 py-2 text-xs text-slate-400">Carregando catálogo…</div>}
            {!isLoading && resultados.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-400">
                Nenhum produto do catálogo encontrado — o texto digitado será mantido.
              </div>
            )}
            {resultados.map((p, i) => (
              <button
                key={p.cod}
                type="button"
                role="option"
                aria-selected={i === ativo}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selecionar(p)
                }}
                onMouseEnter={() => setAtivo(i)}
                className={`flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 ${
                  i === ativo ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className="w-12 shrink-0 font-mono text-xs text-slate-400">{p.cod}</span>
                <span>
                  <div className="text-slate-800">{destacar(p.nome, termo)}</div>
                  <div className="text-[11px] text-slate-400">{p.cat}</div>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
