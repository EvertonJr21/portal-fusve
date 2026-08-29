import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'

interface Resultado {
  tipo: 'OC' | 'Solicitação' | 'Fornecedor'
  titulo: string
  subtitulo: string
  onSelecionar: () => void
}

const TIPO_CLASSE: Record<Resultado['tipo'], string> = {
  OC: 'bg-status-blue-bg text-status-blue',
  Solicitação: 'bg-status-purple-bg text-status-purple',
  Fornecedor: 'bg-status-green-bg text-status-green',
}

export function BuscaGlobal() {
  const { hospitalId } = useHospital()
  const { data: ocs = [] } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: forns = [] } = useFornecedores()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [aberto, setAberto] = useState(false)

  const resultados = useMemo<Resultado[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const deOCs: Resultado[] = ocs
      .filter((o) => String(o.id).includes(q) || o.fornecedorNome.toLowerCase().includes(q) || (o.estoque ?? '').toLowerCase().includes(q) || o.sit.toLowerCase().includes(q))
      .slice(0, 8)
      .map((o) => ({
        tipo: 'OC',
        titulo: `OC ${o.id}`,
        subtitulo: `${o.fornecedorNome} · ${o.sit}`,
        onSelecionar: () => navigate(`/ocs/ordens?q=${o.id}`),
      }))

    const deSols: Resultado[] = sols
      .filter((s) => String(s.id).includes(q) || s.produto.toLowerCase().includes(q) || s.solicitante.toLowerCase().includes(q) || s.sit.toLowerCase().includes(q))
      .slice(0, 8)
      .map((s) => ({
        tipo: 'Solicitação',
        titulo: `Solicitação #${s.id}`,
        subtitulo: s.produto,
        onSelecionar: () => navigate(`/ocs/solicitacoes?q=${s.id}`),
      }))

    const deForns: Resultado[] = forns
      .filter((f) => f.nome.toLowerCase().includes(q))
      .slice(0, 5)
      .map((f) => ({
        tipo: 'Fornecedor',
        titulo: f.nome,
        subtitulo: f.email || f.wpp || 'Fornecedor',
        onSelecionar: () => navigate(`/ocs/ranking/${f.id}`),
      }))

    return [...deOCs, ...deSols, ...deForns].slice(0, 15)
  }, [query, ocs, sols, forns, navigate])

  const selecionar = (r: Resultado) => {
    r.onSelecionar()
    setQuery('')
    setAberto(false)
  }

  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        placeholder="🔍 Buscar OC, solicitação, fornecedor, produto..."
        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {aberto && resultados.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-soft-lg animate-scale-in">
          {resultados.map((r, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => selecionar(r)}
              className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
            >
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TIPO_CLASSE[r.tipo]}`}>{r.tipo}</span>
              <span className="flex-1 truncate">
                <div className="font-medium text-slate-800">{r.titulo}</div>
                <div className="truncate text-[11px] text-slate-400">{r.subtitulo}</div>
              </span>
            </button>
          ))}
        </div>
      )}
      {aberto && query.trim().length >= 2 && resultados.length === 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-400 shadow-soft-lg">
          Nenhum resultado pra "{query}"
        </div>
      )}
    </div>
  )
}
