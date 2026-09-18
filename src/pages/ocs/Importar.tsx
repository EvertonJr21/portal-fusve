import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { UploadCard, type UploadStatus } from '@/components/ocs/UploadCard'
import { SIT_RANK } from '@/constants'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import * as ocRepository from '@/repositories/ocRepository'
import * as solRepository from '@/repositories/solRepository'
import type { OC, Solicitacao } from '@/types'
import { decodeFile, parseOCsCSV, parseSolsCSV } from '@/utils/csv'
import { ocImportadaSchema, solImportadaSchema, validarLote, vinculoAcompSchema } from '@/utils/validators'

type Relatorio = 'ocs' | 'sols' | 'acomp'

function sitAvancou(atual: string, nova: string): boolean {
  return (SIT_RANK[nova] ?? 0) > (SIT_RANK[atual] ?? 0)
}

const ICON_OCS = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-8 4h10a2 2 0 002-2V6a2 2 0 00-2-2H9.5L5 8.5V18a2 2 0 002 2z" />
  </svg>
)

const ICON_SOLS = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4" />
  </svg>
)

const ICON_PDF = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M9 15l3 3 3-3M12 12v6" />
  </svg>
)

export default function Importar() {
  const { hospitalId } = useHospital()
  const { data: ocs = [] } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const queryClient = useQueryClient()

  const [log, setLog] = useState<string[]>([])
  const [ativo, setAtivo] = useState<Relatorio | null>(null)
  const [status, setStatus] = useState<Record<Relatorio, UploadStatus>>({
    ocs: { state: 'idle' },
    sols: { state: 'idle' },
    acomp: { state: 'idle' },
  })
  const logRef = useRef<HTMLDivElement>(null)

  const addLog = (linha: string) => setLog((l) => [...l, linha])
  const setCardStatus = (key: Relatorio, s: UploadStatus) => setStatus((prev) => ({ ...prev, [key]: s }))

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [log])

  const importarOCsCSV = async (file: File) => {
    setAtivo('ocs')
    setCardStatus('ocs', { state: 'processing' })
    setLog([`📄 ${file.name}`])
    try {
      const texto = await decodeFile(file)
      const { validos: itens, invalidos } = validarLote(parseOCsCSV(texto), ocImportadaSchema)
      for (const { item, erros } of invalidos) {
        addLog(`⚠ OC ${item.id || '?'} ignorada — ${erros.join('; ')}`)
      }
      let added = 0
      let updated = 0
      let skipped = 0

      for (let i = 0; i < itens.length; i++) {
        const item = itens[i]
        const existente = ocs.find((o) => o.id === item.id)
        if (existente) {
          const patch: Partial<OC> = {}
          if (sitAvancou(existente.sit, item.sit)) patch.sit = item.sit as OC['sit']
          if (item.fornecedorNome && existente.fornecedorNome !== item.fornecedorNome) {
            patch.fornecedorNome = item.fornecedorNome
            patch.fornecedorId = item.fornecedorId
          }
          if (item.previsaoForn && !existente.previsaoForn) patch.previsaoForn = item.previsaoForn
          if (Object.keys(patch).length) {
            await ocRepository.atualizarCamposOC(item.id, patch)
            updated++
            addLog(`OC ${item.id} — ${item.sit}`)
          } else {
            skipped++
          }
        } else {
          await ocRepository.criarOCImportada({
            id: item.id,
            dataSolic: item.dataSolic,
            fornecedorNome: item.fornecedorNome,
            fornecedorId: item.fornecedorId,
            sit: item.sit,
            estoque: item.estoque || 'SUP CAF',
            solicitacaoId: null,
            previsaoForn: item.previsaoForn,
            diasAtraso: item.diasAtraso,
            hospitalId,
            ultimaMovimentacao: item.dataSolic,
          })
          added++
          addLog(`OC ${item.id} — ${item.sit} (nova)`)
        }
      }
      const resumo = `${added} novas | ${updated} atualizadas | ${skipped} sem mudança${invalidos.length ? ` | ${invalidos.length} ignoradas (formato inválido)` : ''}`
      addLog(`─ OCs CSV: ${resumo}`)
      setCardStatus('ocs', { state: 'done', message: resumo })
      await queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog(`❌ Erro: ${msg}`)
      setCardStatus('ocs', { state: 'error', message: msg })
    } finally {
      setAtivo(null)
    }
  }

  const importarSolsCSV = async (file: File) => {
    setAtivo('sols')
    setCardStatus('sols', { state: 'processing' })
    setLog([`📄 ${file.name}`])
    try {
      const texto = await decodeFile(file)
      const { validos: itens, invalidos } = validarLote(parseSolsCSV(texto, hospitalId), solImportadaSchema)
      for (const { item, erros } of invalidos) {
        addLog(`⚠ Solicitação ${item.id || '?'} ignorada — ${erros.join('; ')}`)
      }
      let added = 0
      let updated = 0
      let skipped = 0

      for (let i = 0; i < itens.length; i++) {
        const item = itens[i]
        const existente = sols.find((s) => s.id === item.id)
        if (existente) {
          const patch: Partial<Solicitacao> = {}
          if (!existente.motivo && item.motivo) patch.motivo = item.motivo
          if (!existente.solicitante && item.solicitante) patch.solicitante = item.solicitante
          if ((!existente.produto || existente.produto.includes('verificar')) && item.produto) {
            patch.produto = item.produto
          }
          if (Object.keys(patch).length) {
            await solRepository.atualizarCamposSol(item.id, patch)
            updated++
            addLog(`Solicitação ${item.id} — ${item.sit}`)
          } else {
            skipped++
          }
        } else {
          await solRepository.salvarSol({
            id: item.id,
            data: item.data,
            produto: item.produto,
            motivo: item.motivo,
            solicitante: item.solicitante,
            qtd: item.qtd,
            sit: item.sit,
            hospitalId,
          })
          added++
          addLog(`Solicitação ${item.id} — ${item.sit} (nova)`)
        }
      }
      const resumo = `${added} novas | ${updated} atualizadas | ${skipped} sem mudança${invalidos.length ? ` | ${invalidos.length} ignoradas (formato inválido)` : ''}`
      addLog(`─ Solicitações CSV: ${resumo}`)
      setCardStatus('sols', { state: 'done', message: resumo })
      await queryClient.invalidateQueries({ queryKey: ['sols', hospitalId] })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog(`❌ Erro: ${msg}`)
      setCardStatus('sols', { state: 'error', message: msg })
    } finally {
      setAtivo(null)
    }
  }

  const importarAcomp = async (file: File) => {
    setAtivo('acomp')
    setCardStatus('acomp', { state: 'processing' })
    const ehPlanilha = /\.xlsx?$/i.test(file.name)
    setLog([`📄 ${file.name} — ${ehPlanilha ? 'lendo planilha...' : 'extraindo texto do PDF...'}`])
    try {
      const vinculosBrutos = ehPlanilha
        ? await (async () => {
            const { extractXlsRows, parseAcompXLS } = await import('@/utils/acompXls')
            return parseAcompXLS(await extractXlsRows(file))
          })()
        : await (async () => {
            const { extractPdfLines, parseAcompPDF } = await import('@/utils/pdf')
            return parseAcompPDF(await extractPdfLines(file))
          })()
      const { validos: vinculos, invalidos } = validarLote(vinculosBrutos, vinculoAcompSchema)
      for (const { item, erros } of invalidos) {
        addLog(`⚠ Vínculo OC ${item.ocId || '?'} ignorado — ${erros.join('; ')}`)
      }
      if (!vinculos.length) {
        const msg = 'Nenhum vínculo encontrado. Verifique se é um relatório de Acompanhamento de Compras válido.'
        addLog(`⚠ ${msg}`)
        setCardStatus('acomp', { state: 'error', message: msg })
        return
      }

      let vinculados = 0
      let criadas = 0

      for (let i = 0; i < vinculos.length; i++) {
        const v = vinculos[i]
        const existente = ocs.find((o) => o.id === v.ocId)
        if (!existente) {
          await ocRepository.criarOCImportada({
            id: v.ocId,
            dataSolic: v.dataOC,
            fornecedorNome: v.fornecedorNome.toUpperCase(),
            fornecedorId: 0,
            sit: 'Autorizada',
            estoque: 'SUP CAF',
            solicitacaoId: v.solicitacaoId,
            previsaoForn: null,
            diasAtraso: 0,
            hospitalId,
            ultimaMovimentacao: v.dataOC,
          })
          criadas++
        } else if (existente.solicitacaoId !== v.solicitacaoId) {
          await ocRepository.atualizarCamposOC(v.ocId, { solicitacaoId: v.solicitacaoId })
          vinculados++
        } else {
          continue
        }
        addLog(`OC ${v.ocId} — vinculada à Solicitação ${v.solicitacaoId}`)
      }
      const resumo = `${vinculados} OC(s) vinculada(s) | ${criadas} OC(s) criada(s)${invalidos.length ? ` | ${invalidos.length} ignorado(s) (formato inválido)` : ''}`
      addLog(`─ Acompanhamento: ${resumo}`)
      setCardStatus('acomp', { state: 'done', message: resumo })
      await queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog(`❌ Erro: ${msg}`)
      setCardStatus('acomp', { state: 'error', message: msg })
    } finally {
      setAtivo(null)
    }
  }

  const processando = ativo !== null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Importar</h2>
        <p className="text-sm text-slate-500">Relatórios do SoulMV — CSV de OCs/Solicitações e Acompanhamento (PDF ou planilha)</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UploadCard
          title="OCs"
          description="R_ORD_COM_FOR.csv — nunca regride a situação de uma OC existente."
          filenameHint="Arquivo .csv"
          accept=".csv"
          accentClass="border-status-blue/30 bg-status-blue-bg text-status-blue"
          icon={ICON_OCS}
          status={status.ocs}
          disabled={processando && ativo !== 'ocs'}
          onFile={importarOCsCSV}
        />
        <UploadCard
          title="Solicitações"
          description="R_SOL_PEND_DATA.csv — só preenche campos vazios de solicitações já existentes."
          filenameHint="Arquivo .csv"
          accept=".csv"
          accentClass="border-status-purple/30 bg-status-purple-bg text-status-purple"
          icon={ICON_SOLS}
          status={status.sols}
          disabled={processando && ativo !== 'sols'}
          onFile={importarSolsCSV}
        />
        <UploadCard
          title="Acompanhamento de Compras"
          description="PDF ou planilha (.xls/.xlsx) — vincula OCs às Solicitações de origem automaticamente."
          filenameHint="Arquivo .pdf, .xls ou .xlsx"
          accept=".pdf,.xls,.xlsx"
          accentClass="border-status-amber/30 bg-status-amber-bg text-status-amber"
          icon={ICON_PDF}
          status={status.acomp}
          disabled={processando && ativo !== 'acomp'}
          onFile={importarAcomp}
        />
      </div>

      {log.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-800 shadow-soft-md">
          <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-800 px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-status-red/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-status-amber/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-status-green/70" />
            <span className="ml-2 font-mono text-[11px] text-slate-400">log de importação</span>
            {processando && (
              <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-status-blue">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-blue" />
                processando…
              </span>
            )}
          </div>
          <div ref={logRef} className="max-h-96 overflow-y-auto bg-slate-900 p-4 font-mono text-xs text-slate-200">
            {log.map((linha, i) => (
              <div key={i} className={linha.startsWith('─') ? 'mt-1 font-semibold text-status-green' : ''}>
                {linha}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
