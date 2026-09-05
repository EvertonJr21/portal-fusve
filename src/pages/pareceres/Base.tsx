import { useState } from 'react'
import { MarcasBadge } from '@/components/pareceres/MarcasBadge'
import { ParecerForm } from '@/components/pareceres/ParecerForm'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableHead } from '@/components/ui/Table'
import { useExcluirParecer, usePareceres } from '@/hooks/usePareceres'
import { useToast } from '@/hooks/useToast'
import type { Parecer } from '@/types'
import { abrirPdfDataUrl } from '@/utils/pdfDataUrl'

function validadeInfo(dataISO: string): { texto: string; classe: string } | null {
  if (!dataISO) return null
  const dt = new Date(dataISO)
  if (Number.isNaN(dt.getTime())) return null
  const agora = new Date()
  const meses = (agora.getFullYear() - dt.getFullYear()) * 12 + (agora.getMonth() - dt.getMonth())
  if (meses < 12) return { texto: `✓ ${meses}m`, classe: 'text-status-green' }
  if (meses < 18) return { texto: `⚠ ${meses}m`, classe: 'text-status-amber' }
  return { texto: `⚠ ${meses}m — Rever`, classe: 'text-status-red' }
}

export default function Base() {
  const { data: pareceres = [], isLoading } = usePareceres()
  const excluir = useExcluirParecer()
  const toast = useToast()

  const [categoria, setCategoria] = useState('')
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Parecer | null>(null)
  const [gerandoPdf, setGerandoPdf] = useState(false)

  const categorias = [...new Set(pareceres.map((p) => p.cat).filter(Boolean))].sort()

  const filtrados = pareceres.filter((p) => {
    if (categoria && p.cat !== categoria) return false
    if (busca) {
      const q = busca.toUpperCase()
      if (!p.cod.includes(q) && !p.nome.toUpperCase().includes(q)) return false
    }
    return true
  })

  const handleExcluir = async (p: Parecer) => {
    if (!confirm(`Apagar o parecer de ${p.cod} — ${p.nome}?`)) return
    try {
      await excluir.mutateAsync(p.cod)
      toast.show('Parecer removido')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao apagar parecer', 'error')
    }
  }

  const exportarPdf = async () => {
    setGerandoPdf(true)
    try {
      const { gerarRelatorioPDF } = await import('@/utils/relatorioParecer')
      gerarRelatorioPDF(filtrados, filtrados.length !== pareceres.length ? pareceres.length : undefined)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao gerar PDF', 'error')
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Base de Pareceres</h2>
          <p className="text-sm text-slate-500">{filtrados.length} registro(s)</p>
        </div>
        <Button variant="outline" onClick={exportarPdf} disabled={gerandoPdf || !filtrados.length}>
          {gerandoPdf ? 'Gerando…' : '📄 Exportar PDF'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar por código ou nome..."
          className="min-w-64 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isLoading ? (
        <SkeletonRows colunas={8} />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Cód.</th>
              <th className="max-w-[220px] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Produto</th>
              <th className="max-w-[140px] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Padrão</th>
              <th className="max-w-[140px] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Permitidas</th>
              <th className="max-w-[140px] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Restritas</th>
              <th className="max-w-[140px] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Proibidas</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Validade</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Ações</th>
            </tr>
          </TableHead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center animate-fade-in">
                  <span className="mb-1 block text-2xl opacity-60">🔍</span>
                  <span className="text-sm font-medium text-slate-500">Nenhum resultado.</span>
                </td>
              </tr>
            )}
            {filtrados.map((p) => {
              const validade = validadeInfo(p.dataParecer)
              return (
                <tr key={p.cod} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{p.cod}</td>
                  <td className="max-w-[220px] px-3 py-2 text-xs">
                    <div className="font-medium text-slate-800">{p.nome}</div>
                    <div className="text-[11px] text-slate-400">{p.cat}</div>
                  </td>
                  <td className="max-w-[140px] px-3 py-2"><MarcasBadge marcas={p.padrao} categoria="padrao" /></td>
                  <td className="max-w-[140px] px-3 py-2"><MarcasBadge marcas={p.permitidas} categoria="permitidas" /></td>
                  <td className="max-w-[140px] px-3 py-2"><MarcasBadge marcas={p.restritas} categoria="restritas" /></td>
                  <td className="max-w-[140px] px-3 py-2"><MarcasBadge marcas={p.proibidas} categoria="proibidas" /></td>
                  <td className="px-3 py-2 text-xs">
                    {validade ? <span className={`font-semibold ${validade.classe}`}>{validade.texto}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => setEditando(p)}
                        className="rounded border border-slate-200 px-1.5 py-1 hover:bg-slate-100"
                      >
                        ✏
                      </button>
                      {p.pdfDataUrl && (
                        <button
                          type="button"
                          onClick={() => abrirPdfDataUrl(p.pdfDataUrl!)}
                          title="Ver PDF"
                          className="rounded border border-slate-200 px-1.5 py-1 hover:bg-slate-100"
                        >
                          📄
                        </button>
                      )}
                      <button
                        type="button"
                        title="Apagar"
                        onClick={() => handleExcluir(p)}
                        className="rounded border border-slate-200 px-1.5 py-1 text-status-red hover:bg-status-red-bg"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}

      {editando && (
        <Modal title={`Editar Parecer — ${editando.cod}`} onClose={() => setEditando(null)}>
          <ParecerForm
            produto={{ cod: editando.cod, nome: editando.nome, cat: editando.cat }}
            parecerExistente={editando}
            onSalvo={() => setEditando(null)}
          />
        </Modal>
      )}
    </div>
  )
}
