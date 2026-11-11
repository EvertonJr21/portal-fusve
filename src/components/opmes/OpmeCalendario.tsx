import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import type { Opme } from '@/types'
import { construirGradeCalendario, construirSemana, STATUS_OPME_LABEL } from '@/utils/opme'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const COR_STATUS: Record<Opme['status'], string> = {
  pendente: 'bg-status-amber',
  finalizado: 'bg-status-green',
}

export type ModoCalendario = 'mes' | 'semana'

interface OpmeCalendarioProps {
  modo: ModoCalendario
  referencia: Date
  opmesPorDia: Map<string, Opme[]>
  nomeFornecedor: (id: number | null) => string
  onDiaClick: (chave: string, temOpme: boolean) => void
  onOpmeClick: (opme: Opme) => void
  /** Arrastar um OPME para outro dia (item 15 da revisão). */
  onMover: (opme: Opme, novaChave: string) => void
}

function chaveDoDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function OpmeCalendario({ modo, referencia, opmesPorDia, nomeFornecedor, onDiaClick, onOpmeClick, onMover }: OpmeCalendarioProps) {
  const celulas = modo === 'mes' ? construirGradeCalendario(referencia) : construirSemana(referencia)
  const hojeChave = chaveDoDia(new Date())
  const [arrastando, setArrastando] = useState<Opme | null>(null)
  const [alvo, setAlvo] = useState<string | null>(null)
  const semana = modo === 'semana'

  const soltar = (chave: string) => {
    if (arrastando && arrastando.dataCirurgia !== chave) onMover(arrastando, chave)
    setArrastando(null)
    setAlvo(null)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-soft-sm">
      <div className={`grid-cols-7 border-b border-slate-100 bg-slate-50 ${semana ? 'hidden md:grid' : 'grid'}`}>
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 md:px-2 md:text-[11px]">
            {d}
          </div>
        ))}
      </div>
      <div className={semana ? 'grid grid-cols-1 md:grid-cols-7' : 'grid grid-cols-7'}>
        {celulas.map((c) => {
          if (!c.data) {
            return <div key={c.chave} className="min-h-14 border-b border-r border-slate-100 bg-slate-50/40 md:min-h-28" />
          }
          const opmesDoDia = opmesPorDia.get(c.chave) ?? []
          const isHoje = c.chave === hojeChave
          const visiveis = semana ? opmesDoDia : opmesDoDia.slice(0, 3)
          return (
            <div
              key={c.chave}
              role="button"
              tabIndex={0}
              onClick={() => onDiaClick(c.chave, opmesDoDia.length > 0)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target === e.currentTarget) onDiaClick(c.chave, opmesDoDia.length > 0)
              }}
              onDragOver={(e) => {
                if (!arrastando) return
                e.preventDefault()
                setAlvo(c.chave)
              }}
              onDragLeave={() => setAlvo((a) => (a === c.chave ? null : a))}
              onDrop={(e) => {
                e.preventDefault()
                soltar(c.chave)
              }}
              className={`flex cursor-pointer flex-col items-stretch gap-1 border-b border-r border-slate-100 p-1 text-left transition-colors hover:bg-blue-50/50 md:p-1.5 ${
                semana ? 'min-h-16 md:min-h-64' : 'min-h-14 md:min-h-28'
              } ${alvo === c.chave ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}
            >
              <span
                className={`self-start rounded-full px-1.5 text-xs font-semibold ${
                  isHoje ? 'bg-blue-700 text-white' : 'text-slate-500'
                }`}
              >
                {semana ? (
                  <>
                    <span className="md:hidden">{DIAS_SEMANA[c.data.getDay()]}, </span>
                    {c.data.getDate()}/{String(c.data.getMonth() + 1).padStart(2, '0')}
                  </>
                ) : (
                  c.data.getDate()
                )}
              </span>

              {/* Celular, visão mensal: só bolinhas — o toque abre a semana do dia */}
              {!semana && opmesDoDia.length > 0 && (
                <div className="flex flex-wrap gap-0.5 px-1 md:hidden">
                  {opmesDoDia.slice(0, 6).map((o) => (
                    <span key={o.id} className={`h-1.5 w-1.5 rounded-full ${COR_STATUS[o.status]}`} />
                  ))}
                </div>
              )}

              <div className={`flex-col gap-1 ${semana ? 'flex' : 'hidden md:flex'}`}>
                {visiveis.map((o) => (
                  <span
                    key={o.id}
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', o.id)
                      setArrastando(o)
                    }}
                    onDragEnd={() => {
                      setArrastando(null)
                      setAlvo(null)
                    }}
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
                    className={`group flex items-start gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200 ${
                      arrastando?.id === o.id ? 'opacity-40' : ''
                    } md:cursor-grab`}
                    title={`${o.paciente} — ${nomeFornecedor(o.fornecedorId)} (${STATUS_OPME_LABEL[o.status]}). Arraste para outro dia para remarcar.`}
                  >
                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${COR_STATUS[o.status]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{o.paciente}</span>
                      {semana && (
                        <span className="block truncate text-[10px] font-normal text-slate-500">{nomeFornecedor(o.fornecedorId)}</span>
                      )}
                    </span>
                    <GripVertical className="mt-0.5 hidden h-3 w-3 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 md:block" />
                  </span>
                ))}
                {!semana && opmesDoDia.length > 3 && (
                  <span className="px-1.5 text-[11px] text-slate-400">+{opmesDoDia.length - 3} mais</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
