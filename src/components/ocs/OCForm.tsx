import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { HospitalId } from '@/constants'
import { SITUACOES_OC } from '@/constants'
import { useSalvarOC } from '@/hooks/useOCs'
import { useToast } from '@/hooks/useToast'
import type { OC, SituacaoOC } from '@/types'
import { fromInput, toInput } from '@/utils/date'

interface OCFormProps {
  oc: OC | null
  hospitalId: HospitalId
  onClose: () => void
}

export function OCForm({ oc, hospitalId, onClose }: OCFormProps) {
  const salvar = useSalvarOC(hospitalId)
  const toast = useToast()

  const [id, setId] = useState(oc ? String(oc.id) : '')
  const [dataSolic, setDataSolic] = useState(toInput(oc?.dataSolic))
  const [fornecedorNome, setFornecedorNome] = useState(oc?.fornecedorNome ?? '')
  const [sit, setSit] = useState<SituacaoOC>((oc?.sit as SituacaoOC) ?? 'Autorizada')
  const [estoque, setEstoque] = useState(oc?.estoque ?? '')
  const [previsaoForn, setPrevisaoForn] = useState(toInput(oc?.previsaoForn))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const idNum = Number(id)
    if (!idNum || !dataSolic || !fornecedorNome.trim()) {
      toast.show('Preencha os campos obrigatórios (*)', 'warn')
      return
    }
    try {
      await salvar.mutateAsync({
        id: idNum,
        dataSolic: fromInput(dataSolic),
        fornecedorNome,
        sit,
        estoque: estoque || 'SUP CAF',
        previsaoForn: previsaoForn ? fromInput(previsaoForn) : null,
        hospitalId,
      })
      toast.show(oc ? `OC ${idNum} atualizada` : `OC ${idNum} criada`)
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar OC', 'error')
    }
  }

  return (
    <Modal
      title={oc ? `Editar OC ${oc.id}` : 'Nova Ordem de Compra'}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="oc-form" type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form id="oc-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Nº OC *</span>
          <input
            type="number"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={id}
            disabled={!!oc}
            onChange={(e) => setId(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Data da Solicitação *</span>
          <input
            type="date"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={dataSolic}
            onChange={(e) => setDataSolic(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Fornecedor *</span>
          <input
            type="text"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={fornecedorNome}
            onChange={(e) => setFornecedorNome(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Situação</span>
          <select
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={sit}
            onChange={(e) => setSit(e.target.value as SituacaoOC)}
          >
            {SITUACOES_OC.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Estoque</span>
          <input
            type="text"
            placeholder="SUP CAF"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={estoque}
            onChange={(e) => setEstoque(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Previsão do fornecedor</span>
          <input
            type="date"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={previsaoForn}
            onChange={(e) => setPrevisaoForn(e.target.value)}
          />
        </label>
      </form>
    </Modal>
  )
}
