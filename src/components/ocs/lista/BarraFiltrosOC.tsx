import { useState, type ReactNode } from 'react'
import { Dropdown } from '@/components/ui/Dropdown'
import { MOTIVOS_OCORRENCIA, SITUACOES_OC } from '@/constants'
import { COLUNAS_OPCIONAIS, type ColunaOpcional } from '@/hooks/useEstadoListaOCs'
import { FILTROS_VAZIOS, filtrosAtivos, SEM_MOTIVO, type FiltrosOC } from '@/utils/ocLista'

interface BarraFiltrosOCProps {
  filtros: FiltrosOC
  onFiltros: (f: FiltrosOC) => void
  estoques: string[]
  colunas: ColunaOpcional[]
  onAlternarColuna: (c: ColunaOpcional) => void
  agrupar: boolean
  onAgrupar: (v: boolean) => void
}

const SELECT = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm'
const BOTAO =
  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap'

export function BarraFiltrosOC({ filtros, onFiltros, estoques, colunas, onAlternarColuna, agrupar, onAgrupar }: BarraFiltrosOCProps) {
  const [painel, setPainel] = useState(() => filtrosAtivos(filtros) > 0)
  const ativos = filtrosAtivos(filtros)
  const set = <K extends keyof FiltrosOC>(k: K, v: FiltrosOC[K]) => onFiltros({ ...filtros, [k]: v })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
            🔍
          </span>
          <input
            type="search"
            value={filtros.busca}
            onChange={(e) => set('busca', e.target.value)}
            placeholder="Buscar por nº da OC, fornecedor, nº da solicitação ou produto"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <button
          type="button"
          onClick={() => setPainel((p) => !p)}
          className={`${BOTAO} ${ativos ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
        >
          ⚙ Filtros{ativos ? ` (${ativos})` : ''}
        </button>
        <button
          type="button"
          onClick={() => onAgrupar(!agrupar)}
          aria-pressed={agrupar}
          className={`${BOTAO} ${agrupar ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
        >
          ▤ Agrupar por fornecedor
        </button>
        <Dropdown
          trigger={
            <button type="button" className={`${BOTAO} border-slate-300 text-slate-700 hover:bg-slate-50`}>
              ☰ Colunas
            </button>
          }
        >
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Mostrar</div>
          {COLUNAS_OPCIONAIS.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <input type="checkbox" checked={colunas.includes(c.id)} onChange={() => onAlternarColuna(c.id)} />
              {c.label}
            </label>
          ))}
        </Dropdown>
      </div>

      {painel && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-soft-sm sm:grid-cols-2 lg:grid-cols-4">
          <Campo rotulo="Situação">
            <select className={SELECT} value={filtros.situacao} onChange={(e) => set('situacao', e.target.value)}>
              <option value="">Todas</option>
              {SITUACOES_OC.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Estoque">
            <select className={SELECT} value={filtros.estoque} onChange={(e) => set('estoque', e.target.value)}>
              <option value="">Todos</option>
              {estoques.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Motivo do atraso">
            <select className={SELECT} value={filtros.motivo} onChange={(e) => set('motivo', e.target.value)}>
              <option value="">Qualquer</option>
              <option value={SEM_MOTIVO}>Sem motivo registrado</option>
              {MOTIVOS_OCORRENCIA.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Solicitação">
            <select className={SELECT} value={filtros.vinculo} onChange={(e) => set('vinculo', e.target.value as FiltrosOC['vinculo'])}>
              <option value="">Com ou sem</option>
              <option value="com">Vinculada</option>
              <option value="sem">Sem vínculo</option>
            </select>
          </Campo>
          <Campo rotulo="Data da OC — de">
            <input type="date" className={SELECT} value={filtros.de} onChange={(e) => set('de', e.target.value)} />
          </Campo>
          <Campo rotulo="Data da OC — até">
            <input type="date" className={SELECT} value={filtros.ate} onChange={(e) => set('ate', e.target.value)} />
          </Campo>
          <Campo rotulo="Previsão do fornecedor em">
            <input type="date" className={SELECT} value={filtros.previsao} onChange={(e) => set('previsao', e.target.value)} />
          </Campo>
          <div className="flex items-end">
            <button
              type="button"
              disabled={!ativos}
              onClick={() => onFiltros({ ...FILTROS_VAZIOS, busca: filtros.busca })}
              className="text-sm font-medium text-blue-700 hover:underline disabled:text-slate-300 disabled:no-underline"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-600">{rotulo}</span>
      {children}
    </label>
  )
}
