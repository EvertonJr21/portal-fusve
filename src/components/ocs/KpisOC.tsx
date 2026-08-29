import { KpiCard } from '@/components/ui/KpiCard'
import { FINAL_SIT } from '@/constants'
import type { OC } from '@/types'
import { dataPrazo, statusPrazo } from '@/utils/oc'
import type { Solicitacao } from '@/types'

interface KpisOCProps {
  ocs: OC[]
  sols: Solicitacao[]
}

export function KpisOC({ ocs, sols }: KpisOCProps) {
  const pendentes = ocs.filter((o) => !(FINAL_SIT as readonly string[]).includes(o.sit))
  const vencidas = ocs.filter((o) => statusPrazo(dataPrazo(o, sols), o.sit) === 'vencida')
  const vinculadas = ocs.filter((o) => o.solicitacaoId)
  const comPrevisao = ocs.filter((o) => o.previsaoForn)

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard label="Total OCs" value={ocs.length} sub="neste filtro" tone="blue" />
      <KpiCard label="Pendentes" value={pendentes.length} sub="sem entrega" tone="amber" />
      <KpiCard label="Vencidas" value={vencidas.length} sub="> 15d" tone="red" />
      <KpiCard label="Vinculadas" value={vinculadas.length} sub="com solicitação" tone="green" />
      <KpiCard label="Com Previsão" value={comPrevisao.length} sub="fornecedor confirmou" tone="gray" />
    </div>
  )
}
