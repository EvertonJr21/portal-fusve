import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useResumoDia } from '@/hooks/useResumoDia'
import type { TomAlerta } from '@/utils/resumoDia'

const KEY = 'fusve:alertasVistos'

function lerVistos(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const TOM_PONTO: Record<TomAlerta, string> = {
  red: 'bg-status-red',
  amber: 'bg-status-amber',
  blue: 'bg-status-blue',
}

/**
 * Sino de avisos do topo: entregas de hoje/amanhã, OCs vencidas, contratos
 * vencendo e OPME pendente perto da cirurgia. O número conta só os avisos ainda
 * não vistos (abrir o sino marca como vistos, neste navegador); um aviso volta a
 * contar quando a situação muda (ex.: "amanhã" vira "hoje").
 */
interface SinoProps {
  /** `barra`: botão com rótulo na barra escura de módulos, menu abre ao lado. `topo`: ícone no topo (celular). */
  variante?: 'barra' | 'topo'
}

export function Sino({ variante = 'topo' }: SinoProps) {
  const { alertas } = useResumoDia()
  const [aberto, setAberto] = useState(false)
  const [vistos, setVistos] = useState<string[]>(lerVistos)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  const novos = alertas.filter((a) => !vistos.includes(a.id))

  const alternar = () => {
    if (!aberto) {
      // Guarda só os ids ainda vigentes — a lista não cresce pra sempre.
      const ids = alertas.map((a) => a.id)
      setVistos(ids)
      try {
        localStorage.setItem(KEY, JSON.stringify(ids))
      } catch {
        /* localStorage indisponível — fica só em memória */
      }
    }
    setAberto((v) => !v)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={alternar}
        title={alertas.length ? `${alertas.length} aviso(s)` : 'Sem avisos'}
        aria-label={`Avisos${novos.length ? ` — ${novos.length} novo(s)` : ''}`}
        className={
          variante === 'barra'
            ? `relative flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[10.5px] font-semibold transition-colors ${aberto ? 'bg-claro/15 text-claro' : 'text-claro/60 hover:bg-claro/10 hover:text-claro'}`
            : 'relative flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} />
        {variante === 'barra' && 'Avisos'}
        {novos.length > 0 && (
          <span
            className={`absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-status-red px-1 text-[10px] font-bold leading-none text-white ${variante === 'barra' ? 'right-3 top-1' : '-right-0.5 -top-0.5'}`}
          >
            {novos.length > 9 ? '9+' : novos.length}
          </span>
        )}
      </button>

      {aberto && (
        <div className={`absolute z-40 w-[min(22rem,calc(100vw-2rem))] animate-scale-in ${variante === 'barra' ? 'bottom-0 left-full ml-3' : 'right-0 mt-2'} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft-lg`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-800">Avisos</span>
            <span className="text-[11px] text-slate-400">hospital ativo</span>
          </div>
          {alertas.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Nada pedindo atenção agora.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {alertas.map((a) => (
                <li key={a.id}>
                  <Link to={a.to} onClick={() => setAberto(false)} className="flex items-start gap-2.5 px-4 py-2 hover:bg-slate-50">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TOM_PONTO[a.tom]}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">{a.titulo}</span>
                      <span className="block truncate text-xs text-slate-500">{a.detalhe}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
