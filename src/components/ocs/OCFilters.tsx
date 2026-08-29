import {
  estoquesDisponiveis,
  FILTRO_INICIAL,
  SITUACOES_FILTRO,
  temFiltroAtivo,
  type FiltroRapido,
  type OCFiltroState,
} from './filters'
import type { OC } from '@/types'

const CHIPS: { key: FiltroRapido; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'vencidas', label: 'Vencidas' },
  { key: 'urgentes', label: 'Urgentes' },
  { key: 'sem_previsao', label: 'Sem previsão' },
  { key: 'sem_movimentacao', label: 'Sem movimentação' },
  { key: 'parciais', label: 'Parciais' },
]

interface OCFiltersProps {
  ocs: OC[]
  filtro: OCFiltroState
  onChange: (f: OCFiltroState) => void
}

export function OCFilters({ ocs, filtro, onChange }: OCFiltersProps) {
  const estoques = estoquesDisponiveis(ocs)
  const set = <K extends keyof OCFiltroState>(key: K, value: OCFiltroState[K]) =>
    onChange({ ...filtro, [key]: value })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={filtro.situacao}
          onChange={(e) => set('situacao', e.target.value)}
        >
          <option value="">Todas as situações</option>
          {SITUACOES_FILTRO.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={filtro.prazo}
          onChange={(e) => set('prazo', e.target.value as OCFiltroState['prazo'])}
        >
          <option value="">Todos os prazos</option>
          <option value="vencida">Vencidas</option>
          <option value="urgente">Urgentes</option>
          <option value="ok">No prazo</option>
        </select>

        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={filtro.estoque}
          onChange={(e) => set('estoque', e.target.value)}
        >
          <option value="">Todos os estoques</option>
          {estoques.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={filtro.vinculo}
          onChange={(e) => set('vinculo', e.target.value as OCFiltroState['vinculo'])}
        >
          <option value="">Todos os vínculos</option>
          <option value="linked">Vinculadas</option>
          <option value="unlinked">Sem vínculo</option>
        </select>

        <input
          type="date"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={filtro.previsaoData}
          onChange={(e) => set('previsaoData', e.target.value)}
          title="Filtrar por data de previsão"
        />

        <input
          type="text"
          placeholder="Buscar fornecedor ou nº OC..."
          className="min-w-48 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={filtro.busca}
          onChange={(e) => set('busca', e.target.value)}
        />

        {temFiltroAtivo(filtro) && (
          <button
            type="button"
            className="text-sm font-medium text-blue-700 hover:underline"
            onClick={() => onChange(FILTRO_INICIAL)}
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => set('rapido', c.key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              filtro.rapido === c.key
                ? 'border-blue-700 bg-blue-700 text-white'
                : 'border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-700'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
