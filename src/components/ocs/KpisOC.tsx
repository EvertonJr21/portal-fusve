import { KpiCard } from '@/components/ui/KpiCard'
import { FINAL_SIT } from '@/constants'
import type { OC } from '@/types'
import { dataPrazo, statusPrazo } from '@/utils/oc'
import type { Solicitacao } from '@/types'
import type { OCFiltroState } from './filters'

interface KpisOCProps {
  ocs: OC[]
  sols: Solicitacao[]
  filtro: OCFiltroState
  onChange: (f: OCFiltroState) => void
}

/**
 * "Vencidas" e "Vinculadas" são clicáveis — aplicam o filtro rápido/vínculo
 * equivalente na tabela abaixo (mesmo padrão da Central de Pendências).
 * "Pendentes" e "Com Previsão" ficam só informativos: não existe hoje um
 * filtro de "situação não-final" nem de "tem previsão preenchida" na tabela
 * (só filtro por data exata de previsão), então tornar clicável exigiria
 * inventar uma dimensão de filtro nova — fora do escopo desta correção.
 */
export function KpisOC({ ocs, sols, filtro, onChange }: KpisOCProps) {
  const pendentes = ocs.filter((o) => !(FINAL_SIT as readonly string[]).includes(o.sit))
  const vencidas = ocs.filter((o) => statusPrazo(dataPrazo(o, sols), o.sit) === 'vencida')
  const vinculadas = ocs.filter((o) => o.solicitacaoId)
  const comPrevisao = ocs.filter((o) => o.previsaoForn)

  const vencidasAtivo = filtro.rapido === 'vencidas'
  const vinculadasAtivo = filtro.vinculo === 'linked'

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard label="Total OCs" value={ocs.length} sub="neste filtro" tone="blue" />
      <KpiCard label="Pendentes" value={pendentes.length} sub="sem entrega" tone="amber" />
      <KpiCard
        label="Vencidas"
        value={vencidas.length}
        sub="> 15d"
        tone="red"
        active={vencidasAtivo}
        onClick={() => onChange({ ...filtro, rapido: vencidasAtivo ? 'all' : 'vencidas' })}
      />
      <KpiCard
        label="Vinculadas"
        value={vinculadas.length}
        sub="com solicitação"
        tone="green"
        active={vinculadasAtivo}
        onClick={() => onChange({ ...filtro, vinculo: vinculadasAtivo ? '' : 'linked' })}
      />
      <KpiCard label="Com Previsão" value={comPrevisao.length} sub="fornecedor confirmou" tone="gray" />
    </div>
  )
}
