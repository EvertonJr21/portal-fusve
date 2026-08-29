import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableHead } from '@/components/ui/Table'
import { FornecedorForm } from '@/components/ocs/FornecedorForm'
import { useExcluirFornecedor, useFornecedores } from '@/hooks/useFornecedores'
import { useToast } from '@/hooks/useToast'
import type { Fornecedor } from '@/types'

export default function Fornecedores() {
  const { data: forns = [], isLoading } = useFornecedores()
  const excluir = useExcluirFornecedor()
  const toast = useToast()

  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState<'novo' | Fornecedor | null>(null)

  const filtrados = busca
    ? forns.filter((f) => f.nome.toLowerCase().includes(busca.toLowerCase()) || String(f.id).includes(busca))
    : forns

  const handleExcluir = async (f: Fornecedor) => {
    if (!confirm(`Excluir o fornecedor ${f.nome}?`)) return
    try {
      await excluir.mutateAsync(f.id)
      toast.show(`Fornecedor ${f.nome} excluído`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir fornecedor', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Cadastro de Fornecedores</h2>
          <p className="text-sm text-slate-500">Contatos usados na cobrança de OCs</p>
        </div>
        <Button onClick={() => setModal('novo')}>+ Novo Fornecedor</Button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome ou ID..."
        className="w-full max-w-sm rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {isLoading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">ID</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Nome</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">E-mail</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">WhatsApp</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Ações</th>
            </tr>
          </TableHead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-400">
                  Nenhum fornecedor encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((f) => (
              <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{f.id}</td>
                <td className="px-3 py-2 text-xs font-medium text-slate-800">{f.nome}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{f.email || '—'}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{f.wpp || '—'}</td>
                <td className="px-3 py-2 text-xs">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => setModal(f)}
                      className="rounded border border-slate-200 px-1.5 py-1 hover:bg-slate-100"
                    >
                      ✏
                    </button>
                    <button
                      type="button"
                      title="Excluir"
                      onClick={() => handleExcluir(f)}
                      className="rounded border border-slate-200 px-1.5 py-1 text-status-red hover:bg-status-red-bg"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {modal && <FornecedorForm forn={modal === 'novo' ? null : modal} onClose={() => setModal(null)} />}
    </div>
  )
}
