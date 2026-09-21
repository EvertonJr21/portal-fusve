import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableHead } from '@/components/ui/Table'
import { FornecedorForm } from '@/components/ocs/FornecedorForm'
import { UploadCard, type UploadStatus } from '@/components/ocs/UploadCard'
import { useConfirm } from '@/hooks/useConfirm'
import { useExcluirFornecedor, useFornecedores } from '@/hooks/useFornecedores'
import { useToast } from '@/hooks/useToast'
import * as fornecedorRepository from '@/repositories/fornecedorRepository'
import type { Fornecedor } from '@/types'
import { decodeFile } from '@/utils/csv'
import { parseFornecedoresCSV } from '@/utils/fornecedoresCsv'
import { fornecedorImportadoSchema, validarLote } from '@/utils/validators'

const PG = 20

const ICON_FORNECEDORES = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l8-4v18M13 21V11l6 3v7M9 9v.01M9 12v.01M9 15v.01" />
  </svg>
)

export default function Fornecedores() {
  const { data: forns = [], isLoading, refetch } = useFornecedores()
  const excluir = useExcluirFornecedor()
  const toast = useToast()
  const confirmar = useConfirm()

  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(0)
  const [modal, setModal] = useState<'novo' | Fornecedor | null>(null)
  const [importStatus, setImportStatus] = useState<UploadStatus>({ state: 'idle' })
  const [log, setLog] = useState<string[]>([])

  const filtrados = busca
    ? forns.filter(
        (f) =>
          f.nome.toLowerCase().includes(busca.toLowerCase()) ||
          String(f.id).includes(busca) ||
          (f.cnpj ?? '').includes(busca),
      )
    : forns
  const inicio = pagina * PG
  const paginados = filtrados.slice(inicio, inicio + PG)

  const handleExcluir = async (f: Fornecedor) => {
    if (!(await confirmar({ message: `Excluir o fornecedor ${f.nome}?`, tone: 'danger', confirmLabel: 'Excluir' }))) return
    try {
      await excluir.mutateAsync(f.id)
      toast.show(`Fornecedor ${f.nome} excluído`)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir fornecedor', 'error')
    }
  }

  const handleImportarCSV = async (file: File) => {
    setImportStatus({ state: 'processing' })
    setLog([`📄 ${file.name} — lendo arquivo...`])
    try {
      const texto = await decodeFile(file)
      const { validos: itens, invalidos } = validarLote(parseFornecedoresCSV(texto), fornecedorImportadoSchema)
      for (const { item, erros } of invalidos) {
        setLog((l) => [...l, `⚠ Fornecedor ${item.id || '?'} ignorado — ${erros.join('; ')}`])
      }

      setLog((l) => [...l, `${itens.length} fornecedores encontrados no arquivo — comparando com o que já está cadastrado...`])
      const existentes = await fornecedorRepository.mapaFornecedoresExistentes()

      const novos = itens.filter((f) => !existentes.has(f.id))
      const paraAtualizarCnpj = itens
        .filter((f) => existentes.has(f.id) && existentes.get(f.id)!.cnpj !== f.cnpj)
        .map((f) => ({ id: f.id, nome: existentes.get(f.id)!.nome, cnpj: f.cnpj }))
      const jaCorretos = itens.length - novos.length - paraAtualizarCnpj.length

      if (novos.length) {
        setLog((l) => [...l, `Cadastrando ${novos.length} fornecedores novos...`])
        await fornecedorRepository.inserirFornecedoresNovos(novos)
      }
      if (paraAtualizarCnpj.length) {
        setLog((l) => [...l, `Preenchendo CNPJ de ${paraAtualizarCnpj.length} fornecedores já cadastrados...`])
        await fornecedorRepository.atualizarCnpjEmLote(paraAtualizarCnpj)
      }
      if (!novos.length && !paraAtualizarCnpj.length && jaCorretos > 0) {
        setLog((l) => [...l, 'ℹ Nenhum fornecedor novo ou alterado — esse arquivo já parece ter sido importado antes.'])
      }

      const resumo = `${novos.length} novos | ${paraAtualizarCnpj.length} com CNPJ preenchido | ${jaCorretos} sem mudança${invalidos.length ? ` | ${invalidos.length} ignorados (formato inválido)` : ''}`
      setLog((l) => [...l, `─ Fornecedores: ${resumo}`])
      setImportStatus({ state: 'done', message: resumo })
      await refetch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setLog((l) => [...l, `❌ Erro: ${msg}`])
      setImportStatus({ state: 'error', message: msg })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Cadastro de Fornecedores</h2>
          <p className="text-sm text-slate-500">Contatos usados na cobrança de OCs e escolha de fornecedor em outros módulos (ex: OPME)</p>
        </div>
        <Button onClick={() => setModal('novo')}>+ Novo Fornecedor</Button>
      </div>

      <div className="max-w-md">
        <UploadCard
          title="Importar cadastro do SoulMV"
          description="R_FORNEC.csv — cadastra fornecedores que ainda não existem aqui e preenche o CNPJ dos que já existem, sem tocar e-mail/WhatsApp já cadastrados."
          filenameHint="Arquivo .csv"
          accept=".csv"
          accentClass="border-status-blue/30 bg-status-blue-bg text-status-blue"
          icon={ICON_FORNECEDORES}
          status={importStatus}
          disabled={importStatus.state === 'processing'}
          onFile={handleImportarCSV}
        />
      </div>

      {log.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-800 shadow-soft-md">
          <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-800 px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-status-red/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-status-amber/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-status-green/70" />
            <span className="ml-2 font-mono text-[11px] text-slate-400">log de importação</span>
          </div>
          <div className="max-h-64 overflow-y-auto bg-slate-900 p-4 font-mono text-xs text-slate-200">
            {log.map((linha, i) => (
              <div key={i} className={linha.startsWith('─') ? 'mt-1 font-semibold text-status-green' : ''}>
                {linha}
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="Buscar por nome, ID ou CNPJ..."
        className="w-full max-w-sm rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value)
          setPagina(0)
        }}
      />

      {isLoading ? (
        <SkeletonRows colunas={6} />
      ) : (
        <>
          <Table>
            <TableHead>
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">ID</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Nome</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">CNPJ</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">E-mail</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">WhatsApp</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Ações</th>
              </tr>
            </TableHead>
            <tbody>
              {paginados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              )}
              {paginados.map((f) => (
                <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{f.id}</td>
                  <td className="px-3 py-2 text-xs font-medium text-slate-800">{f.nome}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{f.cnpj || '—'}</td>
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
          <Pagination page={pagina} pageSize={PG} totalItems={filtrados.length} onPageChange={setPagina} />
        </>
      )}

      {modal && <FornecedorForm forn={modal === 'novo' ? null : modal} onClose={() => setModal(null)} />}
    </div>
  )
}
