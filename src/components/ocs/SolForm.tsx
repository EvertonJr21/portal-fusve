import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { HospitalId } from '@/constants'
import { useSalvarSol } from '@/hooks/useSols'
import { useToast } from '@/hooks/useToast'
import type { Solicitacao } from '@/types'
import { fromInput, toInput } from '@/utils/date'

const SITUACOES_SOL = ['Aberta', 'Parcialmente Atendida', 'Fechada', 'Cancelada']

interface SolFormProps {
  sol: Solicitacao | null
  hospitalId: HospitalId
  onClose: () => void
}

export function SolForm({ sol, hospitalId, onClose }: SolFormProps) {
  const salvar = useSalvarSol(hospitalId)
  const toast = useToast()

  const [id, setId] = useState(sol ? String(sol.id) : '')
  const [data, setData] = useState(toInput(sol?.data))
  const [produto, setProduto] = useState(sol?.produto ?? '')
  const [motivo, setMotivo] = useState(sol?.motivo ?? '')
  const [solicitante, setSolicitante] = useState(sol?.solicitante ?? '')
  const [qtd, setQtd] = useState(sol ? String(sol.qtd) : '1')
  const [sit, setSit] = useState(sol?.sit ?? 'Aberta')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const idNum = Number(id)
    if (!idNum || !data || !produto.trim()) {
      toast.show('Preencha os campos obrigatórios (*)', 'warn')
      return
    }
    try {
      await salvar.mutateAsync({
        id: idNum,
        data: fromInput(data),
        produto: produto.trim(),
        motivo,
        solicitante,
        qtd: Number(qtd) || 1,
        sit,
        hospitalId,
      })
      toast.show(sol ? `Solicitação ${idNum} atualizada` : `Solicitação ${idNum} criada`)
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar solicitação', 'error')
    }
  }

  return (
    <Modal
      title={sol ? `Editar Solicitação ${sol.id}` : 'Nova Solicitação'}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="sol-form" type="submit" loading={salvar.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="sol-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Nº Solicitação *</span>
          <input
            type="number"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={id}
            disabled={!!sol}
            onChange={(e) => setId(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Data *</span>
          <input
            type="date"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Produto *</span>
          <input
            type="text"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={produto}
            onChange={(e) => setProduto(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Motivo</span>
          <input
            type="text"
            placeholder="Ex.: COMPRA NORMAL, COTAÇÃO..."
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Solicitante</span>
          <input
            type="text"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={solicitante}
            onChange={(e) => setSolicitante(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Quantidade</span>
            <input
              type="number"
              min={1}
              className="rounded-md border border-slate-300 px-2 py-1.5"
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Situação</span>
            <select
              className="rounded-md border border-slate-300 px-2 py-1.5"
              value={sit}
              onChange={(e) => setSit(e.target.value)}
            >
              {SITUACOES_SOL.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>
    </Modal>
  )
}
