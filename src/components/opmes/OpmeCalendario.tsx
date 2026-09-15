import { Badge } from '@/components/ui/Badge'
import { construirGradeCalendario, STATUS_OPME_TONE } from '@/utils/opme'
import type { Opme } from '@/types'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface OpmeCalendarioProps {
  mesReferencia: Date
  opmesPorDia: Map<string, Opme[]>
  nomeFornecedor: (id: number | null) => string
  onDiaClick: (chave: string) => void
  onOpmeClick: (opme: Opme) => void
}

function chaveDoDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function OpmeCalendario({ mesReferencia, opmesPorDia, nomeFornecedor, onDiaClick, onOpmeClick }: OpmeCalendarioProps) {
  const celulas = construirGradeCalendario(mesReferencia)
  const hojeChave = chaveDoDia(new Date())

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {celulas.map((c) => {
          if (!c.data) {
            return <div key={c.chave} className="min-h-28 border-b border-r border-slate-100 bg-slate-50/40" />
          }
          const opmesDoDia = opmesPorDia.get(c.chave) ?? []
          const isHoje = c.chave === hojeChave
          return (
            <button
              key={c.chave}
              type="button"
              onClick={() => onDiaClick(c.chave)}
              className="flex min-h-28 flex-col items-stretch gap-1 border-b border-r border-slate-100 p-1.5 text-left transition-colors hover:bg-blue-50/50"
            >
              <span
                className={`self-start rounded-full px-1.5 text-xs font-semibold ${
                  isHoje ? 'bg-blue-700 text-white' : 'text-slate-500'
                }`}
              >
                {c.data.getDate()}
              </span>
              <div className="flex flex-col gap-1">
                {opmesDoDia.slice(0, 3).map((o) => (
                  <span
                    key={o.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpmeClick(o)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        onOpmeClick(o)
                      }
                    }}
                    className="truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                    title={`${o.paciente} — ${nomeFornecedor(o.fornecedorId)}`}
                  >
                    <Badge tone={STATUS_OPME_TONE[o.status]}>●</Badge> {o.paciente}
                  </span>
                ))}
                {opmesDoDia.length > 3 && (
                  <span className="px-1.5 text-[11px] text-slate-400">+{opmesDoDia.length - 3} mais</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
