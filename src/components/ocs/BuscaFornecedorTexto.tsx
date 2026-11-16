import { FileSignature, History } from 'lucide-react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import type { Fornecedor } from '@/types'
import { normalizarTexto } from '@/utils/produtos'

interface BuscaFornecedorTextoProps {
  value: string
  onChange: (nome: string) => void
  onEscolher: (f: Fornecedor) => void
  cadastro: Fornecedor[]
  /** Quantas vezes cada fornecedor já foi usado — sobe na lista e aparece com o campo vazio. */
  uso: Map<number, number>
  rotuloUso: string
  comContrato: Set<number>
  className: string
  placeholder?: string
}

const LIMITE = 12
const LIMITE_SUGESTOES = 8

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
 * Campo de fornecedor em texto livre com sugestões do cadastro (item 110,
 * formulário de OC): busca por nome, código ou CNPJ; os já usados vêm
 * primeiro e, com o campo vazio, aparecem os mais usados. Escolher grava
 * nome e código juntos.
 */
export function BuscaFornecedorTexto({
  value,
  onChange,
  onEscolher,
  cadastro,
  uso,
  rotuloUso,
  comContrato,
  className,
  placeholder,
}: BuscaFornecedorTextoProps) {
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const termo = value.trim()

  const opcoes = useMemo(() => {
    const vezes = (f: Fornecedor) => uso.get(f.id) ?? 0
    if (!termo) {
      return cadastro
        .filter((f) => vezes(f) > 0)
        .sort((a, b) => vezes(b) - vezes(a) || a.nome.localeCompare(b.nome))
        .slice(0, LIMITE_SUGESTOES)
    }
    const inicio = normalizarTexto(termo)
    return cadastro
      .filter((f) => casa(f, termo))
      .map((f) => ({ f, peso: vezes(f) * 10 + (comContrato.has(f.id) ? 5 : 0) + (normalizarTexto(f.nome).startsWith(inicio) ? 1 : 0) }))
      .sort((a, b) => b.peso - a.peso || a.f.nome.localeCompare(b.f.nome))
      .slice(0, LIMITE)
      .map((r) => r.f)
  }, [cadastro, termo, uso, comContrato])

  const escolher = (f: Fornecedor) => {
    setAberto(false)
    onEscolher(f)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!aberto || opcoes.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAtivo((i) => Math.min(i + 1, opcoes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      escolher(opcoes[Math.min(ativo, opcoes.length - 1)])
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setAberto(false)
    }
  }

  const mostrar = aberto && opcoes.length > 0

  return (
    <div className="relative">
      <input
        type="text"
        className={`${className} w-full`}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={mostrar}
        placeholder={placeholder ?? 'Nome, código ou CNPJ do fornecedor'}
        onChange={(e) => {
          onChange(e.target.value)
          setAberto(true)
          setAtivo(0)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={onKeyDown}
      />
      {mostrar && (
        <ul role="listbox" className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-soft-lg">
          {!termo && <li className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Mais usados em {rotuloUso}</li>}
          {opcoes.map((f, i) => {
            const vezes = uso.get(f.id) ?? 0
            return (
              <li key={f.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === ativo}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(f)}
                  onMouseEnter={() => setAtivo(i)}
                  className={`flex w-full flex-col px-3 py-2 text-left text-sm ${i === ativo ? 'bg-slate-100' : ''}`}
                >
                  <span className="truncate font-medium text-slate-800">{f.nome}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span>cód. {f.id}</span>
                    {f.cnpj && <span>{f.cnpj}</span>}
                    {vezes > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-blue-700">
                        <History className="h-3 w-3" /> {vezes} {rotuloUso}
                      </span>
                    )}
                    {comContrato.has(f.id) && (
                      <span className="inline-flex items-center gap-0.5 text-status-green">
                        <FileSignature className="h-3 w-3" /> contrato ativo
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
