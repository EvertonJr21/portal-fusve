import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { HOSPITAIS, STATUS_OPME, type HospitalId } from '@/constants'
import { useConfirm } from '@/hooks/useConfirm'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useExcluirOpme, useSalvarOpme } from '@/hooks/useOpmes'
import { useToast } from '@/hooks/useToast'
import type { Opme } from '@/types'

interface OpmeFormProps {
  opme: Opme | null
  hospitalIdPadrao: HospitalId
  dataCirurgiaPadrao?: string
  onClose: () => void
}

function novoOpme(hospitalId: HospitalId, dataCirurgia: string): Opme {
  return {
    id: crypto.randomUUID(),
    paciente: '',
    dataCirurgia,
    fornecedorId: null,
    hospitalId,
    status: 'pendente',
    observacao: '',
  }
}

const inputClass = 'rounded-md border border-slate-300 px-2 py-1.5 text-sm'
const labelClass = 'flex flex-col gap-1 text-sm'

export function OpmeForm({ opme, hospitalIdPadrao, dataCirurgiaPadrao, onClose }: OpmeFormProps) {
  const isNovo = !opme
  const [form, setForm] = useState<Opme>(opme ?? novoOpme(hospitalIdPadrao, dataCirurgiaPadrao ?? ''))
  const { data: fornecedores = [] } = useFornecedores()
  const salvar = useSalvarOpme(form.hospitalId)
  const excluir = useExcluirOpme(form.hospitalId)
  const toast = useToast()
  const confirmar = useConfirm()

  const handleExcluir = async () => {
    if (!opme || !(await confirmar({ message: `Excluir o OPME de ${opme.paciente}?`, tone: 'danger', confirmLabel: 'Excluir' })))
      return
    try {
      await excluir.mutateAsync(opme.id)
      toast.show('OPME excluído')
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir OPME', 'error')
    }
  }

  const handleSalvar = async () => {
    if (!form.paciente.trim()) {
      toast.show('Informe o nome do paciente', 'error')
      return
    }
    if (!form.dataCirurgia) {
      toast.show('Informe a data da cirurgia', 'error')
      return
    }
    try {
      await salvar.mutateAsync(form)
      toast.show(isNovo ? 'OPME cadastrado' : 'OPME atualizado')
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar OPME', 'error')
    }
  }

  return (
    <Modal
      title={isNovo ? 'Novo OPME' : 'Editar OPME'}
      onClose={onClose}
      footer={
        <>
          {!isNovo && (
            <Button variant="outline" className="mr-auto text-status-red" onClick={handleExcluir} loading={excluir.isPending}>
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} loading={salvar.isPending}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className={labelClass}>
          Paciente
          <input
            type="text"
            className={inputClass}
            value={form.paciente}
            onChange={(e) => setForm({ ...form, paciente: e.target.value })}
            autoFocus
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Data da cirurgia
            <input
              type="date"
              className={inputClass}
              value={form.dataCirurgia}
              onChange={(e) => setForm({ ...form, dataCirurgia: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Hospital
            <select
              className={inputClass}
              value={form.hospitalId}
              onChange={(e) => setForm({ ...form, hospitalId: e.target.value as HospitalId })}
            >
              {Object.values(HOSPITAIS).map((h) => (
                <option key={h.id} value={h.id}>{h.sigla}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Fornecedor
            <select
              className={inputClass}
              value={form.fornecedorId ?? ''}
              onChange={(e) => setForm({ ...form, fornecedorId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Sem fornecedor</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Status
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Opme['status'] })}
            >
              {STATUS_OPME.map((s) => (
                <option key={s} value={s}>{s === 'pendente' ? 'Pendente' : 'Entregue'}</option>
              ))}
            </select>
          </label>
        </div>

        <label className={labelClass}>
          Observação
          <textarea
            className={inputClass}
            rows={2}
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          />
        </label>
      </div>
    </Modal>
  )
}
