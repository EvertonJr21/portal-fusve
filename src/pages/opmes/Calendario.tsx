import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, FileDown, Plus } from 'lucide-react'
import { OpmeCalendario, type ModoCalendario } from '@/components/opmes/OpmeCalendario'
import { OpmeForm } from '@/components/opmes/OpmeForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHospital } from '@/hooks/useHospital'
import { useOpmes, useSalvarOpme } from '@/hooks/useOpmes'
import { useToast } from '@/hooks/useToast'
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
  const toast = useToast()

  const salvar = useSalvarOpme(hospitalId)
  const [modo, setModoState] = useState<ModoCalendario>(() => {
    try {
      return localStorage.getItem('fusve:opmeModo') === 'semana' ? 'semana' : 'mes'
    } catch {
      return 'mes'
    }
  })
  const setModo = (m: ModoCalendario) => {
    setModoState(m)
    try {
      localStorage.setItem('fusve:opmeModo', m)
    } catch {
      /* preferência só local */
    }
  }
  // Dia de referência: na visão mensal vale o mês; na semanal, a semana que contém o dia.
  const [referencia, setReferencia] = useState(() => new Date())
  const mesReferencia = new Date(referencia.getFullYear(), referencia.getMonth(), 1)
  const [modal, setModal] = useState<{ opme: Opme | null; data?: string } | null>(null)
  const [exportando, setExportando] = useState(false)

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
  const entreguesDoMes = opmesDoMes.filter((o) => o.status === 'finalizado').length

  const hoje = new Date()
  const em7dias = new Date(hoje)
  em7dias.setDate(hoje.getDate() + 7)
  const proximasPendentes = opmes.filter((o) => {
    if (o.status !== 'pendente') return false
    const d = parseDMY(o.dataCirurgia)
    return d && d >= hoje && d <= em7dias
  })

  const navegar = (delta: number) => {
    setReferencia((atual) =>
      modo === 'mes'
        ? new Date(atual.getFullYear(), atual.getMonth() + delta, 1)
        : new Date(atual.getFullYear(), atual.getMonth(), atual.getDate() + delta * 7),
    )
  }

  const rotuloPeriodo = (() => {
    if (modo === 'mes') return `${MESES[referencia.getMonth()]} ${referencia.getFullYear()}`
    const ini = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate() - referencia.getDay())
    const fim = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6)
    return `${fmt(ini).slice(0, 5)} a ${fmt(fim)}`
  })()

  const mover = (o: Opme, novaChave: string) => {
    const antiga = o.dataCirurgia
    salvar.mutate(
      { ...o, dataCirurgia: novaChave },
      {
        onSuccess: () =>
          toast.show(`${o.paciente} remarcado para ${fmt(parseDMY(novaChave))}`, 'info', {
            rotulo: 'Desfazer',
            onClick: () => salvar.mutate({ ...o, dataCirurgia: antiga }),
          }),
        onError: (err) => toast.show(err instanceof Error ? err.message : 'Erro ao remarcar', 'error'),
      },
    )
  }

  const diaClicado = (chave: string, temOpme: boolean) => {
    // No celular, a visão mensal só mostra bolinhas: tocar num dia com OPME abre a semana dele.
    const celular = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    if (celular && modo === 'mes' && temOpme) {
      const d = parseDMY(chave)
      if (d) {
        setReferencia(d)
        setModo('semana')
        return
      }
    }
    setModal({ opme: null, data: chave })
  }

  const handleExportarPDF = async () => {
    setExportando(true)
    try {
      const { gerarRelatorioOpmePDF } = await import('@/utils/relatorioOpme')
      gerarRelatorioOpmePDF(mesReferencia.getMonth(), mesReferencia.getFullYear(), hospitalId, opmesDoMes, fornecedores)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao gerar PDF', 'error')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Calendário de OPME</h2>
          <p className="text-sm text-slate-500">Cirurgias com OPME agendadas e status de entrega</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportarPDF} loading={exportando}>
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">PDF do mês</span>
          </Button>
          <Button onClick={() => setModal({ opme: null })}>
            <Plus className="h-4 w-4" /> Novo OPME
          </Button>
        </div>
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
        <KpiCard label="Finalizados no mês" value={entreguesDoMes} tone="green" />
        <KpiCard label="Pendentes nos próx. 7 dias" value={proximasPendentes.length} tone="red" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => navegar(-1)}
            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold text-slate-700">{rotuloPeriodo}</span>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => navegar(1)}
            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setReferencia(new Date())} className="ml-1 text-xs font-medium text-blue-700 hover:underline">
            Hoje
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-slate-400 lg:inline">Arraste uma cirurgia para outro dia para remarcar</span>
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 text-xs font-medium">
            {(['mes', 'semana'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={`rounded-md px-2.5 py-1 ${modo === m ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {m === 'mes' ? 'Mês' : 'Semana'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows linhas={5} colunas={7} />
      ) : (
        <OpmeCalendario
          modo={modo}
          referencia={referencia}
          opmesPorDia={opmesPorDia}
          nomeFornecedor={(id) => nomeFornecedor(id)}
          onDiaClick={diaClicado}
          onOpmeClick={(o) => setModal({ opme: o })}
          onMover={mover}
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
