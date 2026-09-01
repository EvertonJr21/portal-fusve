import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { UploadCard, type UploadStatus } from '@/components/ocs/UploadCard'
import { SIT_RANK } from '@/constants'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { decodeFile, parseOCsCSV, parseSolsCSV } from '@/utils/csv'

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
      const itens = parseOCsCSV(texto)
      let added = 0
      let updated = 0
      let skipped = 0

      for (let i = 0; i < itens.length; i++) {
        const item = itens[i]
        const existente = ocs.find((o) => o.id === item.id)
        if (existente) {
          const patch: Database['public']['Tables']['ocs']['Update'] = {}
          if (sitAvancou(existente.sit, item.sit)) patch.sit = item.sit
          if (item.fornecedorNome && existente.fornecedorNome !== item.fornecedorNome) {
            patch.fornecedor_nome = item.fornecedorNome
            patch.fornecedor_id = item.fornecedorId
          }
          if (item.previsaoForn && !existente.previsaoForn) patch.previsao_forn = item.previsaoForn
          if (Object.keys(patch).length) {
            const { error } = await supabase.from('ocs').update(patch).eq('id', item.id)
            if (error) throw error
            updated++
            addLog(`OC ${item.id} — ${item.sit}`)
          } else {
            skipped++
          }
        } else {
          const { error } = await supabase.from('ocs').insert({
            id: item.id,
            data_solic: item.dataSolic,
            fornecedor_nome: item.fornecedorNome,
            fornecedor_id: item.fornecedorId,
            sit: item.sit,
            estoque: item.estoque || 'SUP CAF',
            solicitacao_id: null,
            cobrado: false,
            previsao_forn: item.previsaoForn,
            dias_atraso: item.diasAtraso,
            hospital_id: hospitalId,
            proxima_acao: '',
            motivo_atraso: '',
            ultima_movimentacao: item.dataSolic,
            previsao_descumprida: false,
          })
          if (error) throw error
          added++
          addLog(`OC ${item.id} — ${item.sit} (nova)`)
        }
      }
      const resumo = `${added} novas | ${updated} atualizadas | ${skipped} sem mudança`
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
      const itens = parseSolsCSV(texto, hospitalId)
      let added = 0
      let updated = 0
      let skipped = 0

      for (let i = 0; i < itens.length; i++) {
        const item = itens[i]
        const existente = sols.find((s) => s.id === item.id)
        if (existente) {
          const patch: Database['public']['Tables']['sols']['Update'] = {}
          if (!existente.motivo && item.motivo) patch.motivo = item.motivo
          if (!existente.solicitante && item.solicitante) patch.solicitante = item.solicitante
          if ((!existente.produto || existente.produto.includes('verificar')) && item.produto) {
            patch.produto = item.produto
          }
          if (Object.keys(patch).length) {
            const { error } = await supabase.from('sols').update(patch).eq('id', item.id)
            if (error) throw error
            updated++
            addLog(`Solicitação ${item.id} — ${item.sit}`)
          } else {
            skipped++
          }
        } else {
          const { error } = await supabase.from('sols').insert({
            id: item.id,
            data: item.data,
            produto: item.produto,
            motivo: item.motivo,
            solicitante: item.solicitante,
            qtd: item.qtd,
            sit: item.sit,
            hospital_id: hospitalId,
          })
          if (error) throw error
          added++
          addLog(`Solicitação ${item.id} — ${item.sit} (nova)`)
        }
      }
      const resumo = `${added} novas | ${updated} atualizadas | ${skipped} sem mudança`
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

  const importarAcompPDF = async (file: File) => {
    setAtivo('acomp')
    setCardStatus('acomp', { state: 'processing' })
    setLog([`📄 ${file.name} — extraindo texto do PDF...`])
    try {
      const { extractPdfLines, parseAcompPDF } = await import('@/utils/pdf')
      const linhas = await extractPdfLines(file)
      const vinculos = parseAcompPDF(linhas)
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
          const { error } = await supabase.from('ocs').insert({
            id: v.ocId,
            data_solic: v.dataOC,
            fornecedor_nome: v.fornecedorNome.toUpperCase(),
            fornecedor_id: 0,
            sit: 'Autorizada',
            estoque: 'SUP CAF',
            solicitacao_id: v.solicitacaoId,
            cobrado: false,
            previsao_forn: null,
            dias_atraso: 0,
            hospital_id: hospitalId,
            proxima_acao: '',
            motivo_atraso: '',
            ultima_movimentacao: v.dataOC,
            previsao_descumprida: false,
          })
          if (error) throw error
          criadas++
        } else if (existente.solicitacaoId !== v.solicitacaoId) {
          const { error } = await supabase.from('ocs').update({ solicitacao_id: v.solicitacaoId }).eq('id', v.ocId)
          if (error) throw error
          vinculados++
        } else {
          continue
        }
        addLog(`OC ${v.ocId} — vinculada à Solicitação ${v.solicitacaoId}`)
      }
      const resumo = `${vinculados} OC(s) vinculada(s) | ${criadas} OC(s) criada(s)`
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
        <p className="text-sm text-slate-500">Relatórios do SoulMV — CSV de OCs/Solicitações e PDF de Acompanhamento</p>
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
          description="PDF — vincula OCs às Solicitações de origem automaticamente."
          filenameHint="Arquivo .pdf"
          accept=".pdf"
          accentClass="border-status-amber/30 bg-status-amber-bg text-status-amber"
          icon={ICON_PDF}
          status={status.acomp}
          disabled={processando && ativo !== 'acomp'}
          onFile={importarAcompPDF}
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
