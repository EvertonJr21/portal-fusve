import { useCallback, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Pagination } from '@/components/ui/Pagination'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableHead } from '@/components/ui/Table'
import { OpmeForm } from '@/components/opmes/OpmeForm'
import { STATUS_OPME, type StatusOpme } from '@/constants'
import { useConfirm } from '@/hooks/useConfirm'
import { useFornecedores } from '@/hooks/useFornecedores'
import { useHospital } from '@/hooks/useHospital'
import { useAlternarStatusOpme, useExcluirOpme, useOpmes } from '@/hooks/useOpmes'
import { useToast } from '@/hooks/useToast'
import type { Opme } from '@/types'
import { fmt, parseDMY } from '@/utils/date'
import { STATUS_OPME_LABEL, STATUS_OPME_TONE } from '@/utils/opme'

const PG = 20

export default function Gestao() {
  const { hospitalId } = useHospital()
  const { data: opmes = [], isLoading, error } = useOpmes(hospitalId)
  const { data: fornecedores = [] } = useFornecedores()
  const alternarStatus = useAlternarStatusOpme(hospitalId)
  const excluir = useExcluirOpme(hospitalId)
  const toast = useToast()
  const confirmar = useConfirm()

  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'' | StatusOpme>('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [pagina, setPagina] = useState(0)
  const [modal, setModal] = useState<Opme | null>(null)

  const nomeFornecedor = useCallback(
    (id: number | null) => fornecedores.find((f) => f.id === id)?.nome ?? '—',
    [fornecedores],
  )

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return opmes
      .filter((o) => !statusFiltro || o.status === statusFiltro)
      .filter((o) => !de || o.dataCirurgia >= de)
      .filter((o) => !ate || o.dataCirurgia <= ate)
      .filter((o) => !q || o.paciente.toLowerCase().includes(q) || nomeFornecedor(o.fornecedorId).toLowerCase().includes(q))
      .sort((a, b) => (a.dataCirurgia < b.dataCirurgia ? -1 : a.dataCirurgia > b.dataCirurgia ? 1 : 0))
  }, [opmes, busca, statusFiltro, de, ate, nomeFornecedor])

  const inicio = pagina * PG
  const paginados = filtrados.slice(inicio, inicio + PG)

  const handleAlternarStatus = async (o: Opme) => {
    const novo: StatusOpme = o.status === 'pendente' ? 'entregue' : 'pendente'
    try {
      await alternarStatus.mutateAsync({ id: o.id, status: novo })
      toast.show(novo === 'entregue' ? 'OPME marcado como finalizado' : 'OPME marcado como pendente')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao atualizar status', 'error')
    }
  }

  const handleExcluir = async (o: Opme) => {
    if (!(await confirmar({ message: `Excluir o OPME de ${o.paciente}?`, tone: 'danger', confirmLabel: 'Excluir' }))) return
    try {
      await excluir.mutateAsync(o.id)
      toast.show('OPME excluído')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir OPME', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Gestão de OPME</h2>
        <p className="text-sm text-slate-500">Todas as cirurgias com OPME, com filtros e detalhes — o calendário mostra só a visão do mês</p>
      </div>

      {error && <p className="text-sm text-status-red">Erro ao carregar OPMEs: {error.message}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por paciente ou fornecedor..."
          className="w-full max-w-xs rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setPagina(0)
          }}
        />
        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={statusFiltro}
          onChange={(e) => {
            setStatusFiltro(e.target.value as '' | StatusOpme)
            setPagina(0)
          }}
        >
          <option value="">Todos os status</option>
          {STATUS_OPME.map((s) => (
            <option key={s} value={s}>{STATUS_OPME_LABEL[s]}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          De
          <input
            type="date"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={de}
            onChange={(e) => {
              setDe(e.target.value)
              setPagina(0)
            }}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          Até
          <input
            type="date"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={ate}
            onChange={(e) => {
              setAte(e.target.value)
              setPagina(0)
            }}
          />
        </label>
        {(busca || statusFiltro || de || ate) && (
          <Button
            variant="outline"
            onClick={() => {
              setBusca('')
              setStatusFiltro('')
              setDe('')
              setAte('')
              setPagina(0)
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows colunas={6} />
      ) : (
        <>
          <Table>
            <TableHead>
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Data</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Paciente</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Fornecedor</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Observação</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Ações</th>
              </tr>
            </TableHead>
            <tbody>
              {paginados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
                    Nenhum OPME encontrado.
                  </td>
                </tr>
              )}
              {paginados.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs font-medium text-slate-700">{fmt(parseDMY(o.dataCirurgia))}</td>
                  <td className="px-3 py-2 text-xs font-medium text-slate-800">{o.paciente}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{nomeFornecedor(o.fornecedorId)}</td>
                  <td className="px-3 py-2 text-xs">
                    <button type="button" onClick={() => handleAlternarStatus(o)} title="Clique pra alternar o status">
                      <Badge tone={STATUS_OPME_TONE[o.status]}>{STATUS_OPME_LABEL[o.status]}</Badge>
                    </button>
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-slate-500" title={o.observacao}>
                    {o.observacao || '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex gap-1">
                      <IconButton title="Editar" onClick={() => setModal(o)}>✏</IconButton>
                      <IconButton title="Excluir" tone="danger" onClick={() => handleExcluir(o)}>✕</IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={pagina} pageSize={PG} totalItems={filtrados.length} onPageChange={setPagina} />
        </>
      )}

      {modal && <OpmeForm opme={modal} hospitalIdPadrao={hospitalId} onClose={() => setModal(null)} />}
    </div>
  )
}
