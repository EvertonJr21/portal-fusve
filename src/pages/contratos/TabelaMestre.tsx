import { useState } from 'react'
import { ContratoForm } from '@/components/contratos/ContratoForm'
import { StatusContratoBadge, VigenciaBadge } from '@/components/contratos/ContratoStatusBadge'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import { Table, TableHead } from '@/components/ui/Table'
import { HOSPITAIS, STATUS_CONTRATO, TIPOS_CONTRATO } from '@/constants'
import { useContratos, useExcluirContrato } from '@/hooks/useContratos'
import { useHospital } from '@/hooks/useHospital'
import { useToast } from '@/hooks/useToast'
import type { ContratoHeader } from '@/types'
import { statusVigencia } from '@/utils/contrato'

export default function TabelaMestre() {
  const { hospitalId } = useHospital()
  const { data: contratos = [], isLoading, error } = useContratos(hospitalId)
  const excluir = useExcluirContrato(hospitalId)
  const toast = useToast()

  const [status, setStatus] = useState('')
  const [tipo, setTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState<'novo' | ContratoHeader | null>(null)

  const filtrados = contratos.filter((c) => {
    if (status && c.status !== status) return false
    if (tipo && c.tipo !== tipo) return false
    if (busca) {
      const q = busca.toLowerCase()
      if (!c.fornecedorNome.toLowerCase().includes(q) && !c.fornecedorCnpj.includes(q)) return false
    }
    return true
  })

  const ativos = contratos.filter((c) => c.status === 'Ativo').length
  const vencendoEmBreve = contratos.filter((c) => {
    const s = statusVigencia(c)
    return s === 'atencao' || s === 'critico'
  }).length
  const vencidos = contratos.filter((c) => statusVigencia(c) === 'vencido').length

  const handleExcluir = async (c: ContratoHeader) => {
    if (!confirm(`Excluir o contrato com ${c.fornecedorNome}?`)) return
    try {
      await excluir.mutateAsync(c.id)
      toast.show('Contrato excluído')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir contrato', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Contratos</h2>
          <p className="text-sm text-slate-500">Contratos e acordos comerciais com fornecedores</p>
        </div>
        <Button onClick={() => setModal('novo')}>+ Novo Contrato</Button>
      </div>

      {error && (
        <p className="text-sm text-status-red">
          Erro ao carregar contratos: {error.message}
          {error.message.includes('contratos') && ' — a tabela pode ainda não existir no Supabase (ver CLAUDE.md).'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total" value={contratos.length} tone="blue" />
        <KpiCard label="Ativos" value={ativos} tone="green" />
        <KpiCard label="Vencendo em breve" value={vencendoEmBreve} tone="amber" />
        <KpiCard label="Vencidos" value={vencidos} tone="red" />
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_CONTRATO.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {TIPOS_CONTRATO.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar por fornecedor ou CNPJ..."
          className="min-w-64 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Fornecedor</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Tipo</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Hospital</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Vigência</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Ações</th>
            </tr>
          </TableHead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
                  Nenhum contrato encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-xs">
                  <div className="font-medium text-slate-800">{c.fornecedorNome}</div>
                  {c.fornecedorCnpj && <div className="text-[11px] text-slate-400">{c.fornecedorCnpj}</div>}
                </td>
                <td className="px-3 py-2 text-xs">{c.tipo}</td>
                <td className="px-3 py-2 text-xs">{c.hospitalId === 'ambos' ? 'Ambos' : HOSPITAIS[c.hospitalId].sigla}</td>
                <td className="px-3 py-2"><StatusContratoBadge status={c.status} /></td>
                <td className="px-3 py-2"><VigenciaBadge contrato={c} /></td>
                <td className="px-3 py-2 text-xs">
                  <div className="flex gap-1">
                    <button type="button" title="Editar" onClick={() => setModal(c)} className="rounded border border-slate-200 px-1.5 py-1 hover:bg-slate-100">✏</button>
                    <button type="button" title="Excluir" onClick={() => handleExcluir(c)} className="rounded border border-slate-200 px-1.5 py-1 text-status-red hover:bg-status-red-bg">✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {modal && (
        <ContratoForm contrato={modal === 'novo' ? null : modal} hospitalIdPadrao={hospitalId} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
