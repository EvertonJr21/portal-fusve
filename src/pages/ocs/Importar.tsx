import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { SIT_RANK } from '@/constants'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { decodeFile, parseOCsCSV, parseSolsCSV } from '@/utils/csv'

function sitAvancou(atual: string, nova: string): boolean {
  return (SIT_RANK[nova] ?? 0) > (SIT_RANK[atual] ?? 0)
}

export default function Importar() {
  const { hospitalId } = useHospital()
  const { data: ocs = [] } = useOCs(hospitalId)
  const { data: sols = [] } = useSols(hospitalId)
  const queryClient = useQueryClient()

  const [log, setLog] = useState<string[]>([])
  const [progresso, setProgresso] = useState('')
  const [processando, setProcessando] = useState(false)
  const ocInputRef = useRef<HTMLInputElement>(null)
  const solInputRef = useRef<HTMLInputElement>(null)
  const acompInputRef = useRef<HTMLInputElement>(null)

  const addLog = (linha: string) => setLog((l) => [...l, linha])

  const importarOCsCSV = async (file: File) => {
    setProcessando(true)
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
        }
        setProgresso(`OC ${item.id} — ${i + 1}/${itens.length} (${added} novas, ${updated} atualizadas, ${skipped} sem mudança)`)
      }
      setProgresso('')
      addLog(`─ OCs CSV: ${added} novas | ${updated} atualizadas | ${skipped} sem mudança`)
      await queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    } catch (err) {
      addLog(`❌ Erro: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setProgresso('')
      setProcessando(false)
    }
  }

  const importarSolsCSV = async (file: File) => {
    setProcessando(true)
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
        }
        setProgresso(`Solicitação ${item.id} — ${i + 1}/${itens.length} (${added} novas, ${updated} atualizadas, ${skipped} sem mudança)`)
      }
      setProgresso('')
      addLog(`─ Solicitações CSV: ${added} novas | ${updated} atualizadas | ${skipped} sem mudança`)
      await queryClient.invalidateQueries({ queryKey: ['sols', hospitalId] })
    } catch (err) {
      addLog(`❌ Erro: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setProgresso('')
      setProcessando(false)
    }
  }

  const importarAcompPDF = async (file: File) => {
    setProcessando(true)
    setLog([`📄 ${file.name} — extraindo texto do PDF...`])
    try {
      const { extractPdfLines, parseAcompPDF } = await import('@/utils/pdf')
      const linhas = await extractPdfLines(file)
      const vinculos = parseAcompPDF(linhas)
      if (!vinculos.length) {
        addLog('⚠ Nenhum vínculo encontrado neste PDF. Verifique se é um relatório de Acompanhamento de Compras válido.')
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
        }
        setProgresso(`OC ${v.ocId} — ${i + 1}/${vinculos.length} (${vinculados} vinculadas, ${criadas} criadas)`)
      }
      setProgresso('')
      addLog(`─ Acompanhamento: ${vinculados} OC(s) vinculada(s) | ${criadas} OC(s) criada(s)`)
      await queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    } catch (err) {
      addLog(`❌ Erro: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setProgresso('')
      setProcessando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Importar</h2>
        <p className="text-sm text-slate-500">Relatórios do SoulMV — CSV de OCs/Solicitações e PDF de Acompanhamento</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">OCs — R_ORD_COM_FOR.csv</h3>
          <p className="text-xs text-slate-400">Nunca regride a situação de uma OC existente.</p>
          <input
            ref={ocInputRef}
            type="file"
            accept=".csv"
            className="text-xs"
            disabled={processando}
            onChange={(e) => e.target.files?.[0] && importarOCsCSV(e.target.files[0])}
          />
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">Solicitações — R_SOL_PEND_DATA.csv</h3>
          <p className="text-xs text-slate-400">Só preenche campos vazios de solicitações já existentes.</p>
          <input
            ref={solInputRef}
            type="file"
            accept=".csv"
            className="text-xs"
            disabled={processando}
            onChange={(e) => e.target.files?.[0] && importarSolsCSV(e.target.files[0])}
          />
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">Acompanhamento de Compras (PDF)</h3>
          <p className="text-xs text-slate-400">Vincula OCs às Solicitações de origem automaticamente.</p>
          <input
            ref={acompInputRef}
            type="file"
            accept=".pdf"
            className="text-xs"
            disabled={processando}
            onChange={(e) => e.target.files?.[0] && importarAcompPDF(e.target.files[0])}
          />
        </div>
      </div>

      {log.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-900 p-4 font-mono text-xs text-slate-200">
          {log.map((linha, i) => (
            <div key={i}>{linha}</div>
          ))}
          {progresso && <div className="text-status-amber animate-pulse">⏳ {progresso}</div>}
        </div>
      )}
    </div>
  )
}
