import { useEffect, useRef, useState, type ReactNode } from 'react'
import { campoClass, rotuloClass } from '@/components/contratos/estilos'
import { PrecoInput } from '@/components/contratos/PrecoInput'
import { IconButton } from '@/components/ui/IconButton'
import type { ContratoComodato } from '@/types'

interface ComodatosContratoEditorProps {
  contratoId: string
  comodatos: ContratoComodato[]
  onChange: (comodatos: ContratoComodato[]) => void
  /** Erro ao carregar (ex.: migration da tabela ainda não rodada) — mostra aviso em vez de quebrar o formulário. */
  erro?: string | null
}

function novoComodato(contratoId: string): ContratoComodato {
  return {
    id: crypto.randomUUID(),
    contratoId,
    equipamento: '',
    fabricanteModelo: '',
    numeroSerie: '',
    patrimonio: '',
    quantidade: 1,
    localInstalacao: '',
    dataInstalacao: null,
    valorEstimado: null,
    observacao: '',
  }
}

/**
 * Equipamentos em comodato do contrato/acordo (item 83): o que o fornecedor deixou
 * instalado no hospital — identificação (nº de série, patrimônio), onde está e
 * observações (ex.: "vinculado ao consumo dos kits X").
 */
export function ComodatosContratoEditor({ contratoId, comodatos, onChange, erro }: ComodatosContratoEditorProps) {
  const [focoId, setFocoId] = useState<string | null>(null)
  const atualizar = <K extends keyof ContratoComodato>(id: string, key: K, value: ContratoComodato[K]) =>
    onChange(comodatos.map((c) => (c.id === id ? { ...c, [key]: value } : c)))

  const adicionar = () => {
    const novo = novoComodato(contratoId)
    onChange([...comodatos, novo])
    setFocoId(novo.id)
  }

  const totalEquip = comodatos.reduce((n, c) => n + (c.equipamento.trim() ? c.quantidade || 1 : 0), 0)

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Equipamentos em comodato</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            {comodatos.length === 0
              ? 'Equipamentos que o fornecedor deixou no hospital por causa deste contrato'
              : `${totalEquip} equipamento(s) em ${comodatos.length} registro(s)`}
          </p>
        </div>
        <button
          type="button"
          onClick={adicionar}
          disabled={!!erro}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:text-slate-300 disabled:no-underline"
        >
          + Adicionar equipamento
        </button>
      </div>

      {erro ? (
        <p className="rounded-md border border-status-amber/40 bg-status-amber-bg px-3 py-2 text-xs text-status-amber">
          Não foi possível carregar os comodatos ({erro}). Se a migration 202611060004 ainda não foi rodada no Supabase, rode-a
          e recarregue a página.
        </p>
      ) : comodatos.length === 0 ? (
        <button
          type="button"
          onClick={adicionar}
          className="w-full rounded-lg border-2 border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 hover:border-slate-300 hover:text-slate-700"
        >
          Nenhum equipamento em comodato — clique pra adicionar
        </button>
      ) : (
        <ul className="flex flex-col gap-2">
          {comodatos.map((c, i) => (
            <ItemComodato
              key={c.id}
              indice={i + 1}
              comodato={c}
              focar={focoId === c.id}
              onFocado={() => setFocoId(null)}
              onCampo={(k, v) => atualizar(c.id, k, v)}
              onRemover={() => onChange(comodatos.filter((x) => x.id !== c.id))}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

interface ItemComodatoProps {
  indice: number
  comodato: ContratoComodato
  focar: boolean
  onFocado: () => void
  onCampo: <K extends keyof ContratoComodato>(key: K, value: ContratoComodato[K]) => void
  onRemover: () => void
}

function ItemComodato({ indice, comodato: c, focar, onFocado, onCampo, onRemover }: ItemComodatoProps) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!focar) return
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    ref.current?.focus()
    onFocado()
  }, [focar, onFocado])

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3 shadow-soft-sm">
      <div className="flex items-start gap-3">
        <span className="mt-6 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[11px] font-semibold text-violet-700">
          {indice}
        </span>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
          <Campo rotulo="Equipamento *" className="col-span-2">
            <input
              ref={ref}
              className={`${campoClass} ${c.equipamento.trim() ? '' : 'border-status-amber'}`}
              placeholder="Ex.: Bomba de infusão"
              value={c.equipamento}
              onChange={(e) => onCampo('equipamento', e.target.value)}
            />
          </Campo>
          <Campo rotulo="Fabricante / modelo" className="col-span-2">
            <input className={campoClass} placeholder="Ex.: B. Braun Infusomat Space" value={c.fabricanteModelo} onChange={(e) => onCampo('fabricanteModelo', e.target.value)} />
          </Campo>
          <Campo rotulo="Nº de série">
            <input className={`${campoClass} font-mono`} value={c.numeroSerie} onChange={(e) => onCampo('numeroSerie', e.target.value)} />
          </Campo>
          <Campo rotulo="Patrimônio / tag">
            <input className={`${campoClass} font-mono`} value={c.patrimonio} onChange={(e) => onCampo('patrimonio', e.target.value)} />
          </Campo>
          <Campo rotulo="Quantidade">
            <input
              type="text"
              inputMode="numeric"
              className={`${campoClass} tabular-nums`}
              value={c.quantidade || ''}
              onChange={(e) => onCampo('quantidade', parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
              onBlur={() => !c.quantidade && onCampo('quantidade', 1)}
            />
          </Campo>
          <Campo rotulo="Valor estimado (unit.)">
            <PrecoInput valor={c.valorEstimado ?? 0} onChange={(v) => onCampo('valorEstimado', v || null)} />
          </Campo>
          <Campo rotulo="Local / setor de instalação" className="col-span-2">
            <input className={campoClass} placeholder="Ex.: UTI adulto, Hemodinâmica" value={c.localInstalacao} onChange={(e) => onCampo('localInstalacao', e.target.value)} />
          </Campo>
          <Campo rotulo="Data de instalação">
            <input type="date" className={campoClass} value={c.dataInstalacao ?? ''} onChange={(e) => onCampo('dataInstalacao', e.target.value || null)} />
          </Campo>
          <Campo rotulo="Observação" className="col-span-2 sm:col-span-4">
            <input
              className={campoClass}
              placeholder="Ex.: vinculado ao consumo dos kits de infusão do contrato; manutenção por conta do fornecedor"
              value={c.observacao}
              onChange={(e) => onCampo('observacao', e.target.value)}
            />
          </Campo>
        </div>
        <IconButton title="Remover equipamento" tone="danger" onClick={onRemover} className="mt-5 shrink-0">
          ✕
        </IconButton>
      </div>
    </li>
  )
}

function Campo({ rotulo, className = '', children }: { rotulo: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label className={rotuloClass}>{rotulo}</label>
      {children}
    </div>
  )
}
