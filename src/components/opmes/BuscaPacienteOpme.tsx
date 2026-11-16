import { UserRound } from 'lucide-react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { HOSPITAIS } from '@/constants'
import type { PacienteOpme } from '@/utils/opme'
import { normalizarTexto } from '@/utils/produtos'

interface BuscaPacienteOpmeProps {
  value: string
  onChange: (nome: string) => void
  pacientes: PacienteOpme[]
  nomeFornecedor: (id: number | null) => string
  onEscolher: (p: PacienteOpme) => void
  className: string
  autoFocus?: boolean
}

const LIMITE = 6

function dataBR(iso: string): string {
  const [a, m, d] = iso.split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}

/**
 * Campo "Paciente" do OPME com busca (item 109): sugere pacientes que já têm
 * OPME cadastrado, nos dois hospitais. Escolher um copia fornecedor e
 * observação da última cirurgia dele. Texto livre continua valendo.
 */
export function BuscaPacienteOpme({ value, onChange, pacientes, nomeFornecedor, onEscolher, className, autoFocus }: BuscaPacienteOpmeProps) {
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)

  const opcoes = useMemo(() => {
    const palavras = normalizarTexto(value).split(' ').filter(Boolean)
    if (value.trim().length < 2) return []
    const termo = palavras.join(' ')
    // Nome exato primeiro, depois os que começam pelo que foi digitado, depois o resto (mais recente primeiro).
    const peso = (p: PacienteOpme) => (p.chave === termo ? 2 : p.chave.startsWith(termo) ? 1 : 0)
    return pacientes
      .filter((p) => palavras.every((w) => p.chave.includes(w)))
      .sort((a, b) => peso(b) - peso(a))
      .slice(0, LIMITE)
  }, [value, pacientes])

  const escolher = (p: PacienteOpme) => {
    setAberto(false)
    onEscolher(p)
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
        placeholder="Nome do paciente — busca nos OPMEs já cadastrados"
        autoFocus={autoFocus}
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
          <li className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Já tem OPME — copia fornecedor e observação</li>
          {opcoes.map((p, i) => (
            <li key={p.chave}>
              <button
                type="button"
                role="option"
                aria-selected={i === ativo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(p)}
                onMouseEnter={() => setAtivo(i)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${i === ativo ? 'bg-slate-100' : ''}`}
              >
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{p.nome}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {[
                      `${p.opmes.length} cirurgia(s)`,
                      `última ${dataBR(p.ultimo.dataCirurgia)}`,
                      HOSPITAIS[p.ultimo.hospitalId].sigla,
                      nomeFornecedor(p.ultimo.fornecedorId),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
