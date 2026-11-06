import { OTIF_AMOSTRA_MIN } from '@/constants'
import type { ClasseFornecedor } from '@/utils/kpis'

/** Peças visuais compartilhadas pelas telas de desempenho de entrega (OTIF). */

const CORES: Record<ClasseFornecedor['classe'], string> = {
  A: 'bg-status-green-bg text-status-green',
  B: 'bg-status-blue-bg text-status-blue',
  C: 'bg-status-amber-bg text-status-amber',
  D: 'bg-status-red-bg text-status-red',
}

interface ClasseBadgeProps {
  classe: ClasseFornecedor | null
  avaliadas: number
  grande?: boolean
}

export function ClasseBadge({ classe, avaliadas, grande }: ClasseBadgeProps) {
  if (!classe) {
    return (
      <span
        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
        title={`Sem nota: ${avaliadas} OC(s) avaliada(s), mínimo ${OTIF_AMOSTRA_MIN}`}
      >
        sem nota
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold ${CORES[classe.classe]} ${
        grande ? 'h-14 w-14 text-3xl' : 'px-2 py-0.5 text-[11px]'
      }`}
      title={classe.acao}
    >
      {classe.classe}
    </span>
  )
}
