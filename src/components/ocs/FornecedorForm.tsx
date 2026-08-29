import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useSalvarFornecedor } from '@/hooks/useFornecedores'
import { useToast } from '@/hooks/useToast'
import type { Fornecedor } from '@/types'

interface FornecedorFormProps {
  forn: Fornecedor | null
  onClose: () => void
}

export function FornecedorForm({ forn, onClose }: FornecedorFormProps) {
  const salvar = useSalvarFornecedor()
  const toast = useToast()

  const [id, setId] = useState(forn ? String(forn.id) : '')
  const [nome, setNome] = useState(forn?.nome ?? '')
  const [email, setEmail] = useState(forn?.email ?? '')
  const [wpp, setWpp] = useState(forn?.wpp ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const idNum = Number(id)
    if (!idNum || !nome.trim()) {
      toast.show('ID e Nome são obrigatórios', 'warn')
      return
    }
    try {
      await salvar.mutateAsync({ id: idNum, nome, email, wpp })
      toast.show(forn ? `Fornecedor ${idNum} atualizado` : `Fornecedor ${idNum} criado`)
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao salvar fornecedor', 'error')
    }
  }

  return (
    <Modal
      title={forn ? `Editar Fornecedor ${forn.id}` : 'Novo Fornecedor'}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="forn-form" type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form id="forn-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">ID (código no SoulMV) *</span>
          <input
            type="number"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={id}
            disabled={!!forn}
            onChange={(e) => setId(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Nome *</span>
          <input
            type="text"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">E-mail</span>
          <input
            type="email"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">WhatsApp</span>
          <input
            type="text"
            placeholder="55 24 999999999"
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={wpp}
            onChange={(e) => setWpp(e.target.value)}
          />
        </label>
      </form>
    </Modal>
  )
}
