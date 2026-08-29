import { useState } from 'react'
import { CATEGORIAS_MARCA } from '@/utils/marcas'
import type { MarcaCategoria } from '@/types'

export type MarcasPorCategoria = Record<MarcaCategoria, string[]>

interface MarcasEditorProps {
  value: MarcasPorCategoria
  onChange: (value: MarcasPorCategoria) => void
}

/** Editor de marcas por categoria — uma marca só pode estar em uma categoria por vez (replica `aM`/`rM` do legado). */
export function MarcasEditor({ value, onChange }: MarcasEditorProps) {
  const [inputs, setInputs] = useState<Record<MarcaCategoria, string>>({
    padrao: '',
    permitidas: '',
    restritas: '',
    proibidas: '',
  })

  const adicionar = (categoria: MarcaCategoria) => {
    const marca = inputs[categoria].trim().toUpperCase()
    if (!marca) return
    if (value[categoria].includes(marca)) return

    const proximo: MarcasPorCategoria = { padrao: [], permitidas: [], restritas: [], proibidas: [] }
    for (const c of CATEGORIAS_MARCA.map((c) => c.key)) {
      proximo[c] = c === categoria ? [...value[c], marca] : value[c].filter((m) => m !== marca)
    }
    onChange(proximo)
    setInputs((prev) => ({ ...prev, [categoria]: '' }))
  }

  const remover = (categoria: MarcaCategoria, marca: string) => {
    onChange({ ...value, [categoria]: value[categoria].filter((m) => m !== marca) })
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {CATEGORIAS_MARCA.map(({ key, label, descricao }) => (
        <div key={key} className="rounded-md border border-slate-200 p-3">
          <div className="mb-2">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <span className="ml-1 text-xs text-slate-400">— {descricao}</span>
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {value[key].length === 0 && <span className="text-xs text-slate-300">Nenhuma</span>}
            {value[key].map((m) => (
              <span key={m} className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                {m}
                <button
                  type="button"
                  onClick={() => remover(key, m)}
                  className="text-slate-400 hover:text-status-red"
                  aria-label={`Remover ${m}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Adicionar marca..."
              className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
              value={inputs[key]}
              onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  adicionar(key)
                }
              }}
            />
            <button
              type="button"
              onClick={() => adicionar(key)}
              className="rounded border border-slate-300 px-2 text-xs hover:bg-slate-50"
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
