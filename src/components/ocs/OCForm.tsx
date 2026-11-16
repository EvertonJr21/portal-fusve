import { useMemo, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { BuscaFornecedorTexto } from '@/components/ocs/BuscaFornecedorTexto'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { HOSPITAIS, SITUACOES_OC, type HospitalId } from '@/constants'
import { useContratos } from '@/hooks/useContratos'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useGuardaSaida } from '@/hooks/useGuardaSaida'
import { useHospitalDaOC, useOCs, useSalvarOC } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import type { Fornecedor, OC, Solicitacao, SituacaoOC } from '@/types'
import { statusVigencia } from '@/utils/contrato'
import { fmt, fromInput, getHoje, toInput } from '@/utils/date'
import { ligarContratosFornecedores } from '@/utils/kpis'
import {
  acharFornecedorPorNome,
  buscarSolicitacoes,
  estoquesMaisUsados,
  ultimaOCDoFornecedor,
  usoFornecedoresEmOCs,
} from '@/utils/ocFormulario'

interface OCFormProps {
  oc: OC | null
  hospitalId: HospitalId
  onClose: () => void
}

const inputClass = 'rounded-md border border-slate-300 px-2 py-1.5 text-sm'
const labelClass = 'flex flex-col gap-1 text-sm'
const rotuloClass = 'font-medium text-slate-700'

/** Busca da solicitação de origem (número, produto ou solicitante). */
function BuscaSolicitacao({ sols, value, onChange }: { sols: Solicitacao[]; value: number | null; onChange: (s: Solicitacao | null) => void }) {
  const [texto, setTexto] = useState('')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const selecionada = value !== null ? (sols.find((s) => s.id === value) ?? null) : null
  const opcoes = useMemo(() => buscarSolicitacoes(sols, texto), [sols, texto])

  const escolher = (s: Solicitacao) => {
    setTexto('')
    setAberto(false)
    onChange(s)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!aberto || !opcoes.length) return
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

  if (value !== null && !aberto) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <span className="min-w-0 flex-1 truncate">
          <span className="font-mono text-xs text-slate-500">#{value}</span>{' '}
          {selecionada ? selecionada.produto : <span className="text-slate-400">(não está na lista deste hospital)</span>}
        </span>
        <button type="button" onClick={() => setAberto(true)} className="text-xs text-blue-700 hover:underline">
          trocar
        </button>
        <button type="button" onClick={() => onChange(null)} title="Desvincular solicitação" className="text-slate-400 hover:text-status-red">
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        className={`${inputClass} w-full`}
        placeholder="Nº da solicitação, produto ou solicitante (opcional)"
        value={texto}
        autoComplete="off"
        role="combobox"
        aria-expanded={aberto && opcoes.length > 0}
        autoFocus={value !== null}
        onChange={(e) => {
          setTexto(e.target.value)
          setAberto(true)
          setAtivo(0)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={onKeyDown}
      />
      {aberto && opcoes.length > 0 && (
        <ul role="listbox" className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-soft-lg">
          {opcoes.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === ativo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(s)}
                onMouseEnter={() => setAtivo(i)}
                className={`flex w-full flex-col px-3 py-2 text-left text-sm ${i === ativo ? 'bg-slate-100' : ''}`}
              >
                <span className="truncate text-slate-800">
                  <span className="font-mono text-xs text-slate-500">#{s.id}</span> {s.produto}
                </span>
                <span className="truncate text-xs text-slate-500">{[s.data, s.solicitante, `${s.qtd} un.`, s.sit].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Nova/Editar OC. Desde o item 110: fornecedor com busca no cadastro (nome,
 * código ou CNPJ, os já usados primeiro), solicitação de origem buscável,
 * sugestões de estoque, estoque copiado da última OC do fornecedor e aviso
 * de número de OC já cadastrado. Editar preserva os campos operacionais.
 */
export function OCForm({ oc, hospitalId, onClose }: OCFormProps) {
  const guarda = useGuardaSaida(onClose)
  const salvar = useSalvarOC(hospitalId)
  const toast = useToast()
  const { data: ocs = [] } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: cadastro = [] } = useFornecedores()
  const { data: contratos = [] } = useContratos(hospitalId)

  const [id, setId] = useState(oc ? String(oc.id) : '')
  const [dataSolic, setDataSolic] = useState(oc ? toInput(oc.dataSolic) : toInput(fmt(getHoje())))
  const [fornecedorNome, setFornecedorNome] = useState(oc?.fornecedorNome ?? '')
  const [fornecedorId, setFornecedorId] = useState<number | null>(oc?.fornecedorId ?? null)
  const [solicitacaoId, setSolicitacaoId] = useState<number | null>(oc?.solicitacaoId ?? null)
  const [sit, setSit] = useState<SituacaoOC>((oc?.sit as SituacaoOC) ?? 'Autorizada')
  const [estoque, setEstoque] = useState(oc?.estoque ?? '')
  const [previsaoForn, setPrevisaoForn] = useState(toInput(oc?.previsaoForn))
  const [previsaoForn2, setPrevisaoForn2] = useState(toInput(oc?.previsaoForn2))

  const uso = useMemo(() => usoFornecedoresEmOCs(ocs), [ocs])
  const estoques = useMemo(() => estoquesMaisUsados(ocs), [ocs])
  const comContrato = useMemo(() => {
    const ativos = contratos.filter((c) => c.status === 'Ativo' && statusVigencia(c) !== 'vencido')
    return new Set(ligarContratosFornecedores(ativos, cadastro).porFornecedor.keys())
  }, [contratos, cadastro])

  // Nº de OC já cadastrado (só em OC nova): neste hospital pela lista, no outro pelo banco.
  const idNum = Number(id) || null
  const existenteAqui = !oc && idNum ? (ocs.find((o) => o.id === idNum) ?? null) : null
  const { data: hospitalExistente } = useHospitalDaOC(!oc && idNum && !existenteAqui ? idNum : null)
  const existenteOutro = !oc && !existenteAqui && hospitalExistente && hospitalExistente !== hospitalId ? hospitalExistente : null

  const escolherFornecedor = (f: Fornecedor) => {
    setFornecedorNome(f.nome)
    setFornecedorId(f.id)
    guarda.marcar()
    const ultima = ultimaOCDoFornecedor(ocs, f.id, f.nome, oc?.id)
    if (ultima?.estoque && !estoque.trim()) {
      setEstoque(ultima.estoque)
      toast.show(`Estoque da última OC do fornecedor: ${ultima.estoque}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idNum || !dataSolic || !fornecedorNome.trim()) {
      toast.show('Preencha os campos obrigatórios (*)', 'warn')
      return
    }
    if (existenteAqui) {
      toast.show(`A OC ${idNum} já está cadastrada — abra a OC para editar`, 'warn')
      return
    }
    if (existenteOutro) {
      toast.show(`A OC ${idNum} já está cadastrada no ${HOSPITAIS[existenteOutro].sigla}`, 'warn')
      return
    }
    // Texto digitado sem escolher da lista: usa o código se o nome bater com o cadastro.
    const fornId = fornecedorId ?? acharFornecedorPorNome(cadastro, fornecedorNome)?.id ?? null
    try {
      await salvar.mutateAsync({
        ...(oc ?? {}),
        id: idNum,
        dataSolic: fromInput(dataSolic),
        fornecedorNome,
        fornecedorId: fornId,
        solicitacaoId,
        sit,
        estoque: estoque.trim().toUpperCase() || 'SUP CAF',
        previsaoForn: previsaoForn ? fromInput(previsaoForn) : null,
        previsaoForn2: previsaoForn2 ? fromInput(previsaoForn2) : null,
        hospitalId,
      })
      toast.show(oc ? `OC ${idNum} atualizada` : `OC ${idNum} criada`)
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar OC', 'error')
    }
  }

  return (
    <Modal
      title={oc ? `Editar OC ${oc.id}` : 'Nova Ordem de Compra'}
      onClose={guarda.fechar}
      onInput={guarda.marcar}
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="outline" onClick={guarda.fechar}>
            Cancelar
          </Button>
          <Button form="oc-form" type="submit" loading={salvar.isPending} disabled={!!existenteAqui || !!existenteOutro}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="oc-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={rotuloClass}>Nº OC *</span>
            <input
              type="number"
              className={inputClass}
              value={id}
              disabled={!!oc}
              autoFocus={!oc}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </label>
          <label className={labelClass}>
            <span className={rotuloClass}>Data da OC *</span>
            <input type="date" className={inputClass} value={dataSolic} onChange={(e) => setDataSolic(e.target.value)} required />
          </label>
        </div>

        {existenteAqui && (
          <div className="flex flex-col gap-1 rounded-lg border border-status-amber/40 bg-status-amber-bg px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-slate-700">
              A OC <strong>{existenteAqui.id}</strong> já está cadastrada ({existenteAqui.fornecedorNome} · {existenteAqui.sit}).
            </span>
            <Link to={`/ocs/ordens/${existenteAqui.id}`} onClick={onClose} className="shrink-0 text-sm font-medium text-blue-700 hover:underline">
              Abrir a OC →
            </Link>
          </div>
        )}
        {existenteOutro && (
          <p className="rounded-lg border border-status-amber/40 bg-status-amber-bg px-3 py-2 text-sm text-slate-700">
            A OC <strong>{idNum}</strong> já está cadastrada no <strong>{HOSPITAIS[existenteOutro].sigla}</strong>. Troque o hospital no topo para vê-la.
          </p>
        )}

        <div className={labelClass}>
          <span className={rotuloClass}>Fornecedor *</span>
          <BuscaFornecedorTexto
            value={fornecedorNome}
            onChange={(nome) => {
              setFornecedorNome(nome)
              setFornecedorId(null)
            }}
            onEscolher={escolherFornecedor}
            cadastro={cadastro}
            uso={uso}
            rotuloUso="OCs"
            comContrato={comContrato}
            className={inputClass}
          />
          {fornecedorId !== null && (
            <span className="text-[11px] text-slate-400">
              Código SoulMV {fornecedorId}
              {comContrato.has(fornecedorId) && <span className="text-status-green"> · com contrato ativo</span>}
            </span>
          )}
        </div>

        <div className={labelClass}>
          <span className={rotuloClass}>Solicitação de origem</span>
          <BuscaSolicitacao
            sols={sols}
            value={solicitacaoId}
            onChange={(s) => {
              setSolicitacaoId(s ? s.id : null)
              guarda.marcar()
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={rotuloClass}>Situação</span>
            <select className={inputClass} value={sit} onChange={(e) => setSit(e.target.value as SituacaoOC)}>
              {SITUACOES_OC.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            <span className={rotuloClass}>Estoque</span>
            <input
              type="text"
              placeholder="SUP CAF"
              list="oc-form-estoques"
              className={inputClass}
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
            />
            <datalist id="oc-form-estoques">
              {estoques.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={rotuloClass}>{sit === 'Parcialmente Atendida' ? 'Previsão — 1ª entrega' : 'Previsão do fornecedor'}</span>
            <input type="date" className={inputClass} value={previsaoForn} onChange={(e) => setPrevisaoForn(e.target.value)} />
          </label>
          {sit === 'Parcialmente Atendida' && (
            <label className={labelClass}>
              <span className={rotuloClass}>Previsão — 2ª entrega</span>
              <input type="date" className={inputClass} value={previsaoForn2} onChange={(e) => setPrevisaoForn2(e.target.value)} />
            </label>
          )}
        </div>
      </form>
    </Modal>
  )
}
