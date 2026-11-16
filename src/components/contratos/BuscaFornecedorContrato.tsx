import { Building2, FileSignature } from 'lucide-react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import type { Fornecedor } from '@/types'
import type { FornecedorDeContrato } from '@/utils/contrato'
import { normalizarTexto } from '@/utils/produtos'

interface BuscaFornecedorContratoProps {
  value: string
  onChange: (nome: string) => void
  fornecedoresContrato: FornecedorDeContrato[]
  cadastro: Fornecedor[]
  onEscolherContrato: (f: FornecedorDeContrato) => void
  onEscolherCadastro: (f: Fornecedor) => void
  className: string
}

type Opcao = { tipo: 'contrato'; f: FornecedorDeContrato } | { tipo: 'cadastro'; f: Fornecedor }

const LIMITE_CONTRATOS = 5
const LIMITE_CADASTRO = 8

/** Todas as palavras digitadas aparecem no nome, ou os dígitos aparecem no CNPJ. */
function casa(nome: string, cnpj: string | null | undefined, termo: string): boolean {
  const digitos = termo.replace(/\D/g, '')
  if (digitos.length >= 3 && digitos.length === termo.replace(/[\s./-]/g, '').length) {
    return (cnpj ?? '').replace(/\D/g, '').includes(digitos)
  }
  const alvo = normalizarTexto(nome)
  return normalizarTexto(termo)
    .split(' ')
    .every((p) => alvo.includes(p))
}

/**
 * Campo "Nome / Razão Social" do contrato com busca (item 108): sugere os
 * fornecedores que já têm contrato cadastrado (copia contato, logística e
 * condições do último acordo) e o cadastro de fornecedores do SoulMV. Texto
 * livre continua valendo pra fornecedor novo.
 */
export function BuscaFornecedorContrato({
  value,
  onChange,
  fornecedoresContrato,
  cadastro,
  onEscolherContrato,
  onEscolherCadastro,
  className,
}: BuscaFornecedorContratoProps) {
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)

  const opcoes = useMemo<Opcao[]>(() => {
    const termo = value.trim()
    if (termo.length < 2) return []
    const deContratos = fornecedoresContrato.filter((f) => casa(f.nome, f.cnpj, termo)).slice(0, LIMITE_CONTRATOS)
    // O mesmo fornecedor não aparece duas vezes (casa por CNPJ ou nome com o que já tem contrato).
    const cnpjsListados = new Set(deContratos.map((f) => f.cnpj.replace(/\D/g, '')).filter(Boolean))
    const nomesListados = new Set(deContratos.map((f) => normalizarTexto(f.nome)))
    const doCadastro = cadastro
      .filter(
        (f) =>
          casa(f.nome, f.cnpj, termo) &&
          !(f.cnpj && cnpjsListados.has(f.cnpj.replace(/\D/g, ''))) &&
          !nomesListados.has(normalizarTexto(f.nome)),
      )
      .slice(0, LIMITE_CADASTRO)
    return [...deContratos.map((f) => ({ tipo: 'contrato' as const, f })), ...doCadastro.map((f) => ({ tipo: 'cadastro' as const, f }))]
  }, [value, fornecedoresContrato, cadastro])

  const escolher = (o: Opcao) => {
    setAberto(false)
    if (o.tipo === 'contrato') onEscolherContrato(o.f)
    else onEscolherCadastro(o.f)
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
      // Enter escolhe a sugestão em vez de enviar o formulário do contrato.
      e.preventDefault()
      escolher(opcoes[ativo])
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setAberto(false)
    }
  }

  const mostrar = aberto && opcoes.length > 0
  const primeiroCadastro = opcoes.findIndex((o) => o.tipo === 'cadastro')

  return (
    <div className="relative">
      <input
        type="text"
        className={`${className} w-full`}
        value={value}
        required
        autoComplete="off"
        role="combobox"
        aria-expanded={mostrar}
        placeholder="Digite o nome ou CNPJ — busca nos contratos e no cadastro"
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
        <ul role="listbox" className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-soft-lg">
          {opcoes.map((o, i) => (
            <li key={o.tipo === 'contrato' ? o.f.chave : `f${o.f.id}`}>
              {i === 0 && o.tipo === 'contrato' && (
                <div className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Já tem contrato — copia os dados</div>
              )}
              {i === primeiroCadastro && (
                <div className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Cadastro de fornecedores</div>
              )}
              <button
                type="button"
                role="option"
                aria-selected={i === ativo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(o)}
                onMouseEnter={() => setAtivo(i)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${i === ativo ? 'bg-slate-100' : ''}`}
              >
                {o.tipo === 'contrato' ? (
                  <FileSignature className="mt-0.5 h-4 w-4 shrink-0 text-status-green" />
                ) : (
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{o.f.nome}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {o.tipo === 'contrato'
                      ? [o.f.cnpj, `${o.f.contratos.length} contrato(s)`, `último: ${o.f.modelo.titulo || o.f.modelo.tipo}`].filter(Boolean).join(' · ')
                      : [o.f.cnpj, `cód. ${o.f.id}`, o.f.email].filter(Boolean).join(' · ')}
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
