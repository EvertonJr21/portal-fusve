import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { HospitalId } from '@/constants'
import { useAtualizarOC } from '@/hooks/useOCs'
import { useToast } from '@/hooks/useToast'
import type { OC, Solicitacao } from '@/types'

interface OCVincularProps {
  oc: OC
  sols: Solicitacao[]
  hospitalId: HospitalId
  onClose: () => void
}

export function OCVincular({ oc, sols, hospitalId, onClose }: OCVincularProps) {
  const atualizar = useAtualizarOC(hospitalId)
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<number | null>(oc.solicitacaoId)

  const filtradas = busca
    ? sols.filter((s) => s.produto.toLowerCase().includes(busca.toLowerCase()) || String(s.id).includes(busca))
    : sols

  const salvar = async (solicitacaoId: number | null) => {
    try {
      await atualizar.mutateAsync({ id: oc.id, patch: { solicitacaoId } })
      toast.show(solicitacaoId ? `OC ${oc.id} vinculada à Solicitação #${solicitacaoId}` : `OC ${oc.id} desvinculada`)
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao vincular OC', 'error')
    }
  }

  return (
    <Modal
      title={`Vincular OC ${oc.id} a uma Solicitação`}
      onClose={onClose}
      footer={
        <>
          {oc.solicitacaoId && (
            <Button variant="outline" onClick={() => salvar(null)} loading={atualizar.isPending}>
              Desvincular
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => selecionado && salvar(selecionado)}
            disabled={!selecionado}
            loading={atualizar.isPending}
          >
            Confirmar vínculo
          </Button>
        </>
      }
    >
      <input
        type="text"
        placeholder="Buscar por produto ou nº da solicitação..."
        className="mb-3 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        autoFocus
      />
      <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200">
        {filtradas.length === 0 && <p className="p-4 text-center text-sm text-slate-400">Nenhuma solicitação encontrada.</p>}
        {filtradas.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelecionado(s.id)}
            className={`flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 ${
              selecionado === s.id ? 'bg-blue-50' : ''
            }`}
          >
            <span>
              <span className="font-mono text-xs text-slate-500">#{s.id}</span>{' '}
              <span className="text-slate-800">{s.produto}</span>
            </span>
            {selecionado === s.id && <span className="text-blue-700">✓</span>}
          </button>
        ))}
      </div>
    </Modal>
  )
}
