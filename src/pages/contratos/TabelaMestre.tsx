import { CopyPlus, FileText, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ContratoForm } from '@/components/contratos/ContratoForm'
import { StatusContratoBadge, VigenciaBadge } from '@/components/contratos/ContratoStatusBadge'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { KpiCard } from '@/components/ui/KpiCard'
import { Pagination } from '@/components/ui/Pagination'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableHead } from '@/components/ui/Table'
import { HOSPITAIS, STATUS_CONTRATO, TIPOS_CONTRATO } from '@/constants'
import { useDesfazer } from '@/hooks/useDesfazer'
import { useAbrirPdfContrato, useComodatosPorContrato, useContratos, useExcluirContrato, useRenovarContrato } from '@/hooks/useContratos'
import { useAvaliacoesEntrega } from '@/hooks/useDesempenhoEntrega'
import { useHospital } from '@/hooks/useHospital'
import { useToast } from '@/hooks/useToast'
import type { ContratoHeader } from '@/types'
import { ClasseBadge } from '@/components/ocs/desempenho'
import { useConfirm } from '@/hooks/useConfirm'
import { statusVigencia } from '@/utils/contrato'
import { desempenhoPorFornecedor, ligarContratosFornecedores, type DesempenhoFornecedor } from '@/utils/kpis'

const PG = 15
type VigenciaFiltro = '' | 'vencendo' | 'vencido'

export default function TabelaMestre() {
  const { hospitalId } = useHospital()
  const { data: contratos = [], isLoading, error } = useContratos(hospitalId)
  // Erro aqui (ex.: tabela de comodatos ainda não criada) só esconde o selo — não quebra a lista.
  const { data: comodatos } = useComodatosPorContrato(contratos.map((c) => c.id))
  const excluir = useExcluirContrato(hospitalId)
  const toast = useToast()
  const desfazer = useDesfazer()
  const confirmar = useConfirm()
  const renovar = useRenovarContrato(hospitalId)
  const abrirPdf = useAbrirPdfContrato()
  // Nota de entrega do fornecedor de cada contrato (item 92) — mesma do Desempenho de Entrega.
  const { avaliacoes, forns } = useAvaliacoesEntrega()
  const desempenhoDoContrato = useMemo(() => {
    const { fornecedorDoContrato } = ligarContratosFornecedores(contratos, forns)
    const porForn = new Map(desempenhoPorFornecedor(avaliacoes, forns).map((d) => [d.fornecedorId, d]))
    const m = new Map<string, { fornId: number; d: DesempenhoFornecedor | null }>()
    for (const [contratoId, fornId] of fornecedorDoContrato) m.set(contratoId, { fornId, d: porForn.get(fornId) ?? null })
    return m
  }, [contratos, forns, avaliacoes])

  // `?vigencia=vencendo|vencido` (resumo do dia / sino) e `?q=` (busca global).
  const [params] = useSearchParams()
  const [status, setStatus] = useState('')
  const [tipo, setTipo] = useState('')
  const [busca, setBusca] = useState('')
  const qUrl = params.get('q')
  const [qAplicada, setQAplicada] = useState<string | null>(null)
  if (qUrl !== qAplicada) {
    setQAplicada(qUrl)
    if (qUrl) setBusca(qUrl)
  }
  const vigenciaUrl = params.get('vigencia')
  const [vigenciaFiltro, setVigenciaFiltro] = useState<VigenciaFiltro>(
    vigenciaUrl === 'vencendo' || vigenciaUrl === 'vencido' ? vigenciaUrl : '',
  )
  // Link novo com a tela já aberta (ex.: clicou em outro aviso do sino) → reaplica o filtro.
  const [urlAplicada, setUrlAplicada] = useState(vigenciaUrl)
  if (vigenciaUrl !== urlAplicada) {
    setUrlAplicada(vigenciaUrl)
    if (vigenciaUrl === 'vencendo' || vigenciaUrl === 'vencido') setVigenciaFiltro(vigenciaUrl)
  }
  const [pagina, setPagina] = useState(0)
  const [modal, setModal] = useState<'novo' | ContratoHeader | null>(null)

  const filtrados = contratos.filter((c) => {
    if (status && c.status !== status) return false
    if (tipo && c.tipo !== tipo) return false
    if (busca) {
      const q = busca.toLowerCase()
      if (!c.fornecedorNome.toLowerCase().includes(q) && !c.titulo.toLowerCase().includes(q) && !c.fornecedorCnpj.includes(q)) return false
    }
    if (vigenciaFiltro) {
      const s = statusVigencia(c)
      if (vigenciaFiltro === 'vencendo' && s !== 'atencao' && s !== 'critico') return false
      if (vigenciaFiltro === 'vencido' && s !== 'vencido') return false
    }
    return true
  })

  useEffect(() => {
    setPagina(0)
  }, [status, tipo, busca, vigenciaFiltro])

  const inicio = pagina * PG
  const paginados = filtrados.slice(inicio, inicio + PG)

  const ativos = contratos.filter((c) => c.status === 'Ativo').length
  const vencendoEmBreve = contratos.filter((c) => {
    const s = statusVigencia(c)
    return s === 'atencao' || s === 'critico'
  }).length
  const vencidos = contratos.filter((c) => statusVigencia(c) === 'vencido').length

  const handleExcluir = async (c: ContratoHeader) => {
    try {
      await excluir.mutateAsync(c.id)
      desfazer(c.titulo ? `Contrato "${c.titulo}" excluído` : 'Contrato excluído', 'contratos', c.id, ['contratos', hospitalId])
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao excluir contrato', 'error')
    }
  }

  const handleRenovar = async (c: ContratoHeader) => {
    if (
      !(await confirmar({
        message: `Criar a renovação de ${c.titulo ? `"${c.titulo}"` : c.fornecedorNome}? Um contrato novo "Em Negociação" é criado com os mesmos produtos e a vigência seguinte; o atual continua como está.`,
        confirmLabel: 'Criar renovação',
      }))
    )
      return
    try {
      const novo = await renovar.mutateAsync(c)
      toast.show('Renovação criada — ajuste vigência e preços')
      setModal(novo)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Erro ao criar a renovação', 'error')
    }
  }

  const nota = (c: ContratoHeader) => {
    const x = desempenhoDoContrato.get(c.id)
    if (!x?.d) return null
    return (
      <span className="inline-flex items-center gap-1" title={`Entregas do fornecedor: ${x.d.resumo.avaliadas} OC(s) avaliadas`}>
        <ClasseBadge classe={x.d.classe} avaliadas={x.d.resumo.avaliadas} />
      </span>
    )
  }

  const acoes = (c: ContratoHeader) => (
    <div className="flex gap-1">
      {c.pdfPath && (
        <IconButton title={`Abrir PDF do contrato${c.pdfNome ? ` (${c.pdfNome})` : ''}`} onClick={() => abrirPdf.mutate(c.pdfPath as string)}>
          <FileText className="h-3.5 w-3.5" />
        </IconButton>
      )}
      <IconButton title="Editar" onClick={() => setModal(c)}>
        <Pencil className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton title="Renovar (cria uma cópia com nova vigência)" onClick={() => handleRenovar(c)}>
        <CopyPlus className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton title="Excluir" tone="danger" onClick={() => handleExcluir(c)}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <KpiCard
          label="Total"
          value={contratos.length}
          tone="blue"
          active={!status && !vigenciaFiltro}
          onClick={() => {
            setStatus('')
            setVigenciaFiltro('')
          }}
        />
        <KpiCard
          label="Ativos"
          value={ativos}
          tone="green"
          active={status === 'Ativo'}
          onClick={() => setStatus((s) => (s === 'Ativo' ? '' : 'Ativo'))}
        />
        <KpiCard
          label="Vencendo em breve"
          value={vencendoEmBreve}
          tone="amber"
          active={vigenciaFiltro === 'vencendo'}
          onClick={() => setVigenciaFiltro((v) => (v === 'vencendo' ? '' : 'vencendo'))}
        />
        <KpiCard
          label="Vencidos"
          value={vencidos}
          tone="red"
          active={vigenciaFiltro === 'vencido'}
          onClick={() => setVigenciaFiltro((v) => (v === 'vencido' ? '' : 'vencido'))}
        />
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
          placeholder="Buscar por título, fornecedor ou CNPJ..."
          className="min-w-0 flex-1 basis-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isLoading ? (
        <SkeletonRows colunas={6} />
      ) : (
        <>
        <ul className="flex flex-col gap-2 md:hidden">
          {filtrados.length === 0 && <li className="py-8 text-center text-sm text-slate-500">Nenhum contrato encontrado.</li>}
          {paginados.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-soft-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">{c.titulo || c.fornecedorNome}</div>
                  {c.titulo && <div className="truncate text-xs text-slate-600">{c.fornecedorNome}</div>}
                  <div className="text-[11px] text-slate-400">
                    {c.tipo} · {c.hospitalId === 'ambos' ? 'Ambos' : HOSPITAIS[c.hospitalId].sigla}
                  </div>
                </div>
                {nota(c)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusContratoBadge status={c.status} />
                <VigenciaBadge contrato={c} />
              </div>
              <div className="mt-2">{acoes(c)}</div>
            </li>
          ))}
        </ul>
        <div className="hidden md:block">
        <Table>
          <TableHead>
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Contrato / Fornecedor</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Tipo</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Hospital</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Vigência</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500" title="Nota de entrega do fornecedor nas OCs do hospital ativo">Entrega</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Ações</th>
            </tr>
          </TableHead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center animate-fade-in">
                  <span className="text-sm font-medium text-slate-500">Nenhum contrato encontrado.</span>
                </td>
              </tr>
            )}
            {paginados.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-xs">
                  {c.titulo ? (
                    <>
                      <div className="font-semibold text-slate-800">{c.titulo}</div>
                      <div className="text-slate-600">{c.fornecedorNome}</div>
                    </>
                  ) : (
                    <div className="font-medium text-slate-800">{c.fornecedorNome}</div>
                  )}
                  {c.fornecedorCnpj && <div className="text-[11px] text-slate-400">{c.fornecedorCnpj}</div>}
                  {!!comodatos?.get(c.id) && (
                    <span className="mt-0.5 inline-block rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                      {comodatos.get(c.id)} equip. em comodato
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{c.tipo}</td>
                <td className="px-3 py-2 text-xs">{c.hospitalId === 'ambos' ? 'Ambos' : HOSPITAIS[c.hospitalId].sigla}</td>
                <td className="px-3 py-2"><StatusContratoBadge status={c.status} /></td>
                <td className="px-3 py-2"><VigenciaBadge contrato={c} /></td>
                <td className="px-3 py-2">{nota(c) ?? <span className="text-xs text-slate-300">—</span>}</td>
                <td className="px-3 py-2 text-xs">{acoes(c)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        </div>
        </>
      )}

      {!isLoading && filtrados.length > 0 && (
        <Pagination page={pagina} pageSize={PG} totalItems={filtrados.length} onPageChange={setPagina} />
      )}

      {modal && (
        <ContratoForm contrato={modal === 'novo' ? null : modal} hospitalIdPadrao={hospitalId} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
