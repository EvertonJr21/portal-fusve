import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { OCFilters } from '@/components/ocs/OCFilters'
import { FILTRO_INICIAL, filtrarOCs, type OCFiltroState } from '@/components/ocs/filters'
import { KpisOC } from '@/components/ocs/KpisOC'
import { OCForm } from '@/components/ocs/OCForm'
import { OCTable } from '@/components/ocs/OCTable'
import { useHospital } from '@/hooks/useHospital'
import { useAtualizarSituacaoOC, useExcluirOC, useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import type { OC, SituacaoOC } from '@/types'

export default function OrdensDeCompra() {
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading, error } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const atualizarSituacao = useAtualizarSituacaoOC(hospitalId)
  const excluir = useExcluirOC(hospitalId)
  const toast = useToast()

  const [filtro, setFiltro] = useState<OCFiltroState>(FILTRO_INICIAL)
  const [modal, setModal] = useState<'novo' | OC | null>(null)

  const filtradas = filtrarOCs(ocs, sols, filtro)

  const handleAtualizarSituacao = async (id: number, sit: string) => {
    try {
      await atualizarSituacao.mutateAsync({ id, sit: sit as SituacaoOC })
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao atualizar situação', 'error')
    }
  }

  const handleExcluir = async (oc: OC) => {
    if (!confirm(`Excluir a OC ${oc.id}?`)) return
    try {
      await excluir.mutateAsync(oc.id)
      toast.show(`OC ${oc.id} excluída`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir OC', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Ordens de Compra</h2>
          <p className="text-sm text-slate-500">Gerencie e acompanhe as OCs</p>
        </div>
        <Button onClick={() => setModal('novo')}>+ Nova OC</Button>
      </div>

      {error && <p className="text-sm text-status-red">Erro ao carregar OCs: {error.message}</p>}

      <KpisOC ocs={filtradas} sols={sols} />

      <OCFilters ocs={ocs} filtro={filtro} onChange={setFiltro} />

      {isLoading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <OCTable
          ocs={filtradas}
          sols={sols}
          filtroKey={JSON.stringify(filtro)}
          onEditar={(oc) => setModal(oc)}
          onExcluir={handleExcluir}
          onAtualizarSituacao={handleAtualizarSituacao}
        />
      )}

      {modal && (
        <OCForm oc={modal === 'novo' ? null : modal} hospitalId={hospitalId} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
