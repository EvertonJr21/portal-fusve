import { useMemo, useState } from 'react'
import { OpmeCalendario } from '@/components/opmes/OpmeCalendario'
import { OpmeForm } from '@/components/opmes/OpmeForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHospital } from '@/hooks/useHospital'
import { useOpmes } from '@/hooks/useOpmes'
import type { Opme } from '@/types'
import { fmt, parseDMY } from '@/utils/date'
import { STATUS_OPME_LABEL, STATUS_OPME_TONE } from '@/utils/opme'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function Calendario() {
  const { hospitalId } = useHospital()
  const { data: opmes = [], isLoading, error } = useOpmes(hospitalId)
  const { data: fornecedores = [] } = useFornecedores()

  const [mesReferencia, setMesReferencia] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [modal, setModal] = useState<{ opme: Opme | null; data?: string } | null>(null)

  const nomeFornecedor = (id: number | null) => fornecedores.find((f) => f.id === id)?.nome ?? '—'

  const opmesPorDia = useMemo(() => {
    const mapa = new Map<string, Opme[]>()
    for (const o of opmes) {
      const lista = mapa.get(o.dataCirurgia) ?? []
      lista.push(o)
      mapa.set(o.dataCirurgia, lista)
    }
    return mapa
  }, [opmes])

  const opmesDoMes = opmes.filter((o) => {
    const d = parseDMY(o.dataCirurgia)
    return d && d.getFullYear() === mesReferencia.getFullYear() && d.getMonth() === mesReferencia.getMonth()
  })
  const pendentesDoMes = opmesDoMes.filter((o) => o.status === 'pendente').length
  const entreguesDoMes = opmesDoMes.filter((o) => o.status === 'entregue').length

  const hoje = new Date()
  const em7dias = new Date(hoje)
  em7dias.setDate(hoje.getDate() + 7)
  const proximasPendentes = opmes.filter((o) => {
    if (o.status !== 'pendente') return false
    const d = parseDMY(o.dataCirurgia)
    return d && d >= hoje && d <= em7dias
  })

  const mudarMes = (delta: number) => {
    setMesReferencia((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Calendário de OPME</h2>
          <p className="text-sm text-slate-500">Cirurgias com OPME agendadas e status de entrega</p>
        </div>
        <Button onClick={() => setModal({ opme: null })}>+ Novo OPME</Button>
      </div>

      {error && (
        <p className="text-sm text-status-red">
          Erro ao carregar OPMEs: {error.message}
          {error.message.includes('opmes') && ' — a tabela pode ainda não existir no Supabase (ver CLAUDE.md).'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Cirurgias no mês" value={opmesDoMes.length} tone="blue" />
        <KpiCard label="Pendentes no mês" value={pendentesDoMes} tone="amber" />
        <KpiCard label="Entregues no mês" value={entreguesDoMes} tone="green" />
        <KpiCard label="Pendentes nos próx. 7 dias" value={proximasPendentes.length} tone="red" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => mudarMes(-1)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-50"
          >
            ←
          </button>
          <span className="min-w-40 text-center text-sm font-semibold text-slate-700">
            {MESES[mesReferencia.getMonth()]} {mesReferencia.getFullYear()}
          </span>
          <button
            type="button"
            onClick={() => mudarMes(1)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-50"
          >
            →
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            const d = new Date()
            d.setDate(1)
            setMesReferencia(d)
          }}
          className="text-xs font-medium text-blue-700 hover:underline"
        >
          Hoje
        </button>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-slate-400">Carregando…</p>
      ) : (
        <OpmeCalendario
          mesReferencia={mesReferencia}
          opmesPorDia={opmesPorDia}
          nomeFornecedor={(id) => nomeFornecedor(id)}
          onDiaClick={(chave) => setModal({ opme: null, data: chave })}
          onOpmeClick={(o) => setModal({ opme: o })}
        />
      )}

      {proximasPendentes.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            Pendentes nos próximos 7 dias
          </h3>
          <ul className="flex flex-col divide-y divide-slate-100">
            {proximasPendentes.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                <button type="button" onClick={() => setModal({ opme: o })} className="text-left hover:underline">
                  <span className="font-medium text-slate-800">{o.paciente}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {fmt(parseDMY(o.dataCirurgia))} — {nomeFornecedor(o.fornecedorId)}
                  </span>
                </button>
                <Badge tone={STATUS_OPME_TONE[o.status]}>{STATUS_OPME_LABEL[o.status]}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modal && (
        <OpmeForm
          opme={modal.opme}
          hospitalIdPadrao={hospitalId}
          dataCirurgiaPadrao={modal.data}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
