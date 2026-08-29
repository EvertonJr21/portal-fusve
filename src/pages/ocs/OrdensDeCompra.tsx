import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { OCFilters } from '@/components/ocs/OCFilters'
import { FILTRO_INICIAL, filtrarOCs, type OCFiltroState } from '@/components/ocs/filters'
import { KpisOC } from '@/components/ocs/KpisOC'
import { OCCobrar } from '@/components/ocs/OCCobrar'
import { OCForm } from '@/components/ocs/OCForm'
import { OCHistorico } from '@/components/ocs/OCHistorico'
import { OCTable } from '@/components/ocs/OCTable'
import { OCVincular } from '@/components/ocs/OCVincular'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHospital } from '@/hooks/useHospital'
import { useAtualizarSituacaoOC, useExcluirOC, useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import type { OC, SituacaoOC } from '@/types'

type Modal =
  | { tipo: 'novo' }
  | { tipo: 'editar'; oc: OC }
  | { tipo: 'vincular'; oc: OC }
  | { tipo: 'historico'; oc: OC }
  | { tipo: 'cobrar'; oc: OC; canal: 'mail' | 'wpp' }
  | null

export default function OrdensDeCompra() {
  const { hospitalId } = useHospital()
  const { data: ocs = [], isLoading, error } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const { data: forns = [] } = useFornecedores()
  const atualizarSituacao = useAtualizarSituacaoOC(hospitalId)
  const excluir = useExcluirOC(hospitalId)
  const toast = useToast()

  const [filtro, setFiltro] = useState<OCFiltroState>(FILTRO_INICIAL)
  const [modal, setModal] = useState<Modal>(null)

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
        <Button onClick={() => setModal({ tipo: 'novo' })}>+ Nova OC</Button>
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
          onEditar={(oc) => setModal({ tipo: 'editar', oc })}
          onExcluir={handleExcluir}
          onAtualizarSituacao={handleAtualizarSituacao}
          onVincular={(oc) => setModal({ tipo: 'vincular', oc })}
          onHistorico={(oc) => setModal({ tipo: 'historico', oc })}
          onCobrar={(oc, canal) => setModal({ tipo: 'cobrar', oc, canal })}
        />
      )}

      {modal?.tipo === 'novo' && <OCForm oc={null} hospitalId={hospitalId} onClose={() => setModal(null)} />}
      {modal?.tipo === 'editar' && <OCForm oc={modal.oc} hospitalId={hospitalId} onClose={() => setModal(null)} />}
      {modal?.tipo === 'vincular' && (
        <OCVincular oc={modal.oc} sols={sols} hospitalId={hospitalId} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === 'historico' && (
        <OCHistorico oc={modal.oc} sols={sols} hospitalId={hospitalId} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === 'cobrar' && (
        <OCCobrar
          oc={modal.oc}
          sols={sols}
          forn={forns.find((f) => f.id === modal.oc.fornecedorId)}
          hospitalId={hospitalId}
          canalInicial={modal.canal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
