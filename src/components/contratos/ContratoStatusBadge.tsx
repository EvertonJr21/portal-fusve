import type { StatusContrato } from '@/constants'
import type { ContratoHeader } from '@/types'
import { diasParaVencer, statusVigencia } from '@/utils/contrato'

const STATUS_CLASS: Record<StatusContrato, string> = {
  Ativo: 'bg-status-green-bg text-status-green',
  Inativo: 'bg-status-gray-bg text-status-gray',
  'Em Negociação': 'bg-status-purple-bg text-status-purple',
  Suspenso: 'bg-status-amber-bg text-status-amber',
}

export function StatusContratoBadge({ status }: { status: StatusContrato }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[status]}`}>{status}</span>
  )
}

const VIGENCIA_CLASS: Record<string, string> = {
  vencido: 'bg-status-red-bg text-status-red',
  critico: 'bg-status-red-bg text-status-red',
  atencao: 'bg-status-amber-bg text-status-amber',
  ok: 'bg-status-green-bg text-status-green',
  sem_vigencia: 'bg-status-gray-bg text-status-gray',
}

export function VigenciaBadge({ contrato }: { contrato: Pick<ContratoHeader, 'vigenciaFim' | 'avisoRenovacaoDias'> }) {
  const status = statusVigencia(contrato)
  const dias = diasParaVencer(contrato.vigenciaFim)

  let texto = 'Sem vigência definida'
  if (status === 'vencido') texto = `Vencido há ${Math.abs(dias ?? 0)}d`
  else if (dias !== null) texto = `${dias}d restantes`

  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${VIGENCIA_CLASS[status]}`}>{texto}</span>
}
