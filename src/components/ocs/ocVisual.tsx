import { fmt } from '@/utils/date'
import { textoPrazo, type LinhaOC, type StatusPrazoLista } from '@/utils/ocLista'
import type { Prioridade } from '@/utils/prioridade'

const PRAZO_CLASS: Record<StatusPrazoLista, string> = {
  vencida: 'bg-status-red-bg text-status-red',
  urgente: 'bg-status-amber-bg text-status-amber',
  ok: 'bg-status-gray-bg text-status-gray',
  entregue: 'bg-status-green-bg text-status-green',
  cancelada: 'bg-status-gray-bg text-slate-400',
  sem_data: 'bg-status-gray-bg text-slate-400',
}

/** Badge de prazo — data prometida (contrato ou padrão), com o institucional no tooltip. */
export function BadgePrazo({ linha }: { linha: LinhaOC }) {
  const a = linha.avaliacao
  const titulo = [
    a.dataPrometida && `Prometida: ${fmt(a.dataPrometida)} (OC + ${a.prazoDias}d, ${a.prazoFonte === 'contrato' ? 'contrato' : 'padrão'})`,
    linha.prazoInstitucional && `Institucional: ${fmt(linha.prazoInstitucional)} (solicitação + 15d)`,
  ]
    .filter(Boolean)
    .join('\n')
  return (
    <span title={titulo} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRAZO_CLASS[linha.statusPrazo]}`}>
      {textoPrazo(linha)}
    </span>
  )
}

const PRIORIDADE_CFG: Record<Prioridade, { label: string; dot: string; texto: string }> = {
  critica: { label: 'Crítica', dot: 'bg-status-red', texto: 'text-status-red' },
  alta: { label: 'Alta', dot: 'bg-status-amber', texto: 'text-status-amber' },
  media: { label: 'Média', dot: 'bg-status-blue', texto: 'text-status-blue' },
  normal: { label: 'Normal', dot: 'bg-status-green', texto: 'text-status-green' },
}

export function BadgePrioridade({ prioridade }: { prioridade: Prioridade }) {
  const c = PRIORIDADE_CFG[prioridade]
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${c.texto}`}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} aria-hidden />
      {c.label}
    </span>
  )
}
