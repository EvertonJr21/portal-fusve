import { useState } from 'react'
import { CATEGORIAS_MARCA } from '@/utils/marcas'
import type { MarcaCategoria, ParecerAnexo } from '@/types'

export type MarcasPorCategoria = Record<MarcaCategoria, string[]>
export type AnexosPendentes = Record<MarcaCategoria, Record<string, File[]>>

interface MarcasEditorProps {
  value: MarcasPorCategoria
  onChange: (value: MarcasPorCategoria) => void
  /** PDFs já salvos, vinculados a marcas deste parecer — vazio se o parecer ainda não existe. */
  anexosExistentes: ParecerAnexo[]
  /** PDFs escolhidos nesta sessão de edição, ainda não enviados (vão junto no próximo "Salvar"). */
  anexosPendentes: AnexosPendentes
  onAnexarPendente: (categoria: MarcaCategoria, marca: string, file: File) => void
  onRemoverPendente: (categoria: MarcaCategoria, marca: string, index: number) => void
  onExcluirExistente: (anexo: ParecerAnexo) => void
  onAbrirExistente: (anexo: ParecerAnexo) => void
}

/** Editor de marcas por categoria — uma marca só pode estar em uma categoria por vez (replica `aM`/`rM` do legado). */
export function MarcasEditor({
  value,
  onChange,
  anexosExistentes,
  anexosPendentes,
  onAnexarPendente,
  onRemoverPendente,
  onExcluirExistente,
  onAbrirExistente,
}: MarcasEditorProps) {
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
          <div className="mb-2 flex flex-col gap-1.5">
            {value[key].length === 0 && <span className="text-xs text-slate-300">Nenhuma</span>}
            {value[key].map((m) => {
              const existentesDaMarca = anexosExistentes.filter((a) => a.categoria === key && a.marca === m)
              const pendentesDaMarca = anexosPendentes[key][m] ?? []
              return (
                <div key={m} className="flex flex-col gap-1 rounded bg-slate-100 px-1.5 py-1 text-xs">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium">{m}</span>
                    <button
                      type="button"
                      onClick={() => remover(key, m)}
                      className="text-slate-400 hover:text-status-red"
                      aria-label={`Remover ${m}`}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {existentesDaMarca.map((a) => (
                      <span
                        key={a.id}
                        className="flex items-center gap-1 rounded border border-slate-300 bg-white px-1 py-0.5 text-[10px]"
                      >
                        <button type="button" onClick={() => onAbrirExistente(a)} className="hover:underline">
                          📄 {a.nomeArquivo}
                        </button>
                        <button
                          type="button"
                          onClick={() => onExcluirExistente(a)}
                          aria-label={`Remover PDF ${a.nomeArquivo} de ${m}`}
                          className="text-slate-400 hover:text-status-red"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    {pendentesDaMarca.map((f, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 rounded border border-dashed border-status-blue/40 bg-status-blue-bg px-1 py-0.5 text-[10px] text-status-blue"
                      >
                        📎 {f.name}
                        <button
                          type="button"
                          onClick={() => onRemoverPendente(key, m, i)}
                          aria-label={`Remover PDF pendente ${f.name} de ${m}`}
                          className="text-status-blue/60 hover:text-status-red"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <label className="cursor-pointer rounded border border-dashed border-slate-300 px-1 py-0.5 text-[10px] text-slate-500 hover:border-slate-400">
                      + PDF
                      <input
                        type="file"
                        accept="application/pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) onAnexarPendente(key, m, f)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                </div>
              )
            })}
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
