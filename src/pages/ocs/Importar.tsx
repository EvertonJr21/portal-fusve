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
import { fmt, getHoje } from '@/utils/date'
import { avaliarHospitalDoArquivo, avisoArquivoDeOutroHospital, mensagemErro, siglaHospital } from '@/utils/importacaoHospital'
import { ocAcompanhamentoSchema, ocImportadaSchema, solImportadaSchema, validarLote, vinculoAcompSchema } from '@/utils/validators'

type Relatorio = 'ocs' | 'sols' | 'acomp'

/** Arquivo de Acompanhamento de outro hospital — vira aviso, não erro. */
class ArquivoDeOutroHospital extends Error {}

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

interface ContagemAcomp {
  entradas: number
  vinculos: number
  criadas: number
  semMudanca: number
  ausentes: number
  divergencias: number
  ignoradas: number
}

function novaContagem(): ContagemAcomp {
  return { entradas: 0, vinculos: 0, criadas: 0, semMudanca: 0, ausentes: 0, divergencias: 0, ignoradas: 0 }
}

function somarContagem(total: ContagemAcomp, c: ContagemAcomp) {
  for (const k of Object.keys(total) as (keyof ContagemAcomp)[]) total[k] += c[k]
}

function resumoAcomp(c: ContagemAcomp): string {
  return [
    c.entradas ? `${c.entradas} entrada(s) gravada(s)` : '',
    c.vinculos ? `${c.vinculos} vínculo(s)` : '',
    c.criadas ? `${c.criadas} OC(s) criada(s)` : '',
    c.semMudanca ? `${c.semMudanca} sem mudança` : '',
    c.ausentes ? `${c.ausentes} fora do sistema` : '',
    c.divergencias ? `${c.divergencias} divergência(s) no log` : '',
    c.ignoradas ? `${c.ignoradas} ignorada(s)` : '',
  ]
    .filter(Boolean)
    .join(' | ')
}

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
      const idsAtivo = new Set(ocs.map((o) => o.id))
      const foraDoAtivo = itens.filter((i) => !idsAtivo.has(i.id)).map((i) => i.id)
      const aval = avaliarHospitalDoArquivo(
        itens.length - foraDoAtivo.length,
        foraDoAtivo.length ? await ocRepository.hospitaisDasOCs(foraDoAtivo) : new Map(),
        hospitalId,
      )
      if (aval.arquivoEhDeOutro && aval.outroHospital) {
        const aviso = avisoArquivoDeOutroHospital(aval.outroHospital, hospitalId, aval.deOutro.size, 'OC(s)')
        addLog(`⚠ ${aviso}`)
        setCardStatus('ocs', { state: 'warn', message: aviso })
        return
      }
      let added = 0
      let updated = 0
      let skipped = 0
      let deOutroHospital = 0

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
          // Previsão do relatório nunca é aplicada por importação, nem na 1ª vez
          // (item 72) — mesmo motivo do item 34 pra OC nova: não é confiável, e
          // reimportar o mesmo relatório periodicamente acabava preenchendo o
          // campo de qualquer jeito 1 ciclo depois da OC entrar no sistema. Previsão
          // é só manual (formulário ou clique direto na tabela) daqui pra frente.
          // O relatório do SoulMV não traz data de entrega real — quando a OC vira
          // "Atendida" nesta importação, registra a data de hoje como aproximação
          // (é a única informação real que temos: "quando ficamos sabendo que foi
          // entregue"). Só dispara na transição, nunca sobrescreve entrega já registrada.
          if (patch.sit === 'Atendida' && !existente.dataEntregaReal) {
            patch.dataEntregaReal = fmt(getHoje())
            patch.dataEntregaOrigem = 'estimada'
          }
          // Mesma aproximação da entrega real (item 34): a primeira vez que a OC
          // entra em Parcialmente Atendida nesta importação, registra a data de
          // hoje — nunca sobrescreve se já tinha uma parcial registrada antes.
          if (patch.sit === 'Parcialmente Atendida' && !existente.dataParcial) {
            patch.dataParcial = fmt(getHoje())
          }
          if (Object.keys(patch).length) {
            await ocRepository.atualizarCamposOC(item.id, patch)
            updated++
            const marcador = patch.dataEntregaReal
              ? ' (entrega registrada hoje)'
              : patch.dataParcial
                ? ' (parcial registrada hoje)'
                : ''
            addLog(`OC ${item.id} — ${item.sit}${marcador}`)
          } else {
            skipped++
          }
        } else if (aval.deOutro.has(item.id)) {
          deOutroHospital++
          addLog(`⚠ OC ${item.id} já está cadastrada no ${siglaHospital(aval.deOutro.get(item.id)!)} — ignorada.`)
        } else {
          const entregaNaChegada = item.sit === 'Atendida' ? fmt(getHoje()) : null
          const parcialNaChegada = item.sit === 'Parcialmente Atendida' ? fmt(getHoje()) : null
          await ocRepository.criarOCImportada({
            id: item.id,
            dataSolic: item.dataSolic,
            fornecedorNome: item.fornecedorNome,
            fornecedorId: item.fornecedorId,
            sit: item.sit,
            estoque: item.estoque || 'SUP CAF',
            solicitacaoId: null,
            // Previsão do relatório não é confiável (nem sempre bate) — deixa em
            // branco pro Everton registrar manualmente pelo formulário da OC.
            previsaoForn: null,
            diasAtraso: item.diasAtraso,
            hospitalId,
            ultimaMovimentacao: item.dataSolic,
            dataEntregaReal: entregaNaChegada,
            dataParcial: parcialNaChegada,
            dataEntregaOrigem: entregaNaChegada ? 'estimada' : null,
          })
          added++
          const marcadorNova = entregaNaChegada
            ? ' (entrega registrada hoje)'
            : parcialNaChegada
              ? ' (parcial registrada hoje)'
              : ''
          addLog(`OC ${item.id} — ${item.sit} (nova)${marcadorNova}`)
        }
      }
      if (added === 0 && updated === 0 && skipped > 0) {
        addLog('ℹ Nenhuma OC nova ou alterada — esse arquivo já parece ter sido importado antes.')
      }
      const resumo = `${added} novas | ${updated} atualizadas | ${skipped} sem mudança${deOutroHospital ? ` | ${deOutroHospital} de outro hospital` : ''}${invalidos.length ? ` | ${invalidos.length} ignoradas (formato inválido)` : ''}`
      addLog(`─ OCs CSV: ${resumo}`)
      setCardStatus('ocs', { state: 'done', message: resumo })
      await queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    } catch (err) {
      const msg = mensagemErro(err)
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
      const idsAtivo = new Set(sols.map((x) => x.id))
      const foraDoAtivo = itens.filter((i) => !idsAtivo.has(i.id)).map((i) => i.id)
      const aval = avaliarHospitalDoArquivo(
        itens.length - foraDoAtivo.length,
        foraDoAtivo.length ? await solRepository.hospitaisDasSols(foraDoAtivo) : new Map(),
        hospitalId,
      )
      if (aval.arquivoEhDeOutro && aval.outroHospital) {
        const aviso = avisoArquivoDeOutroHospital(aval.outroHospital, hospitalId, aval.deOutro.size, 'solicitação(ões)')
        addLog(`⚠ ${aviso}`)
        setCardStatus('sols', { state: 'warn', message: aviso })
        return
      }
      let added = 0
      let updated = 0
      let skipped = 0
      let deOutroHospital = 0

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
        } else if (aval.deOutro.has(item.id)) {
          deOutroHospital++
          addLog(`⚠ Solicitação ${item.id} já está cadastrada no ${siglaHospital(aval.deOutro.get(item.id)!)} — ignorada.`)
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
      if (added === 0 && updated === 0 && skipped > 0) {
        addLog('ℹ Nenhuma solicitação nova ou alterada — esse arquivo já parece ter sido importado antes.')
      }
      const resumo = `${added} novas | ${updated} atualizadas | ${skipped} sem mudança${deOutroHospital ? ` | ${deOutroHospital} de outro hospital` : ''}${invalidos.length ? ` | ${invalidos.length} ignoradas (formato inválido)` : ''}`
      addLog(`─ Solicitações CSV: ${resumo}`)
      setCardStatus('sols', { state: 'done', message: resumo })
      await queryClient.invalidateQueries({ queryKey: ['sols', hospitalId] })
    } catch (err) {
      const msg = mensagemErro(err)
      addLog(`❌ Erro: ${msg}`)
      setCardStatus('sols', { state: 'error', message: msg })
    } finally {
      setAtivo(null)
    }
  }

  /**
   * OCs do Acompanhamento que não estão no hospital ativo: se a maioria está no
   * outro hospital, o arquivo é de lá — interrompe com aviso (nada é gravado).
   * Devolve as que estão no outro hospital, pra serem puladas uma a uma.
   */
  const verificarHospitalAcomp = async (ids: number[], base: Map<number, OC>) => {
    const fora = [...new Set(ids)].filter((id) => !base.has(id))
    const aval = avaliarHospitalDoArquivo(
      new Set(ids).size - fora.length,
      fora.length ? await ocRepository.hospitaisDasOCs(fora) : new Map(),
      hospitalId,
    )
    if (aval.arquivoEhDeOutro && aval.outroHospital) {
      throw new ArquivoDeOutroHospital(avisoArquivoDeOutroHospital(aval.outroHospital, hospitalId, aval.deOutro.size, 'OC(s)'))
    }
    return aval.deOutro
  }

  /**
   * Acompanhamento de Compras em planilha/XML (item 79): grava a data de
   * entrada confirmada pelo MV e o vínculo com a solicitação. Não cria OC, não
   * muda a situação, não sobrescreve data digitada à mão nem vínculo já
   * existente — divergências vão pro log. `base` é o estado das OCs já com o que
   * os arquivos anteriores do mesmo lote gravaram.
   */
  const importarAcompMv = async (file: File, base: Map<number, OC>): Promise<ContagemAcomp> => {
    const c = novaContagem()
    const { lerAcompanhamento } = await import('@/utils/acompanhamento')
    const lido = await lerAcompanhamento(file)
    const sol = lido.ocs.find((o) => o.solicitacaoId)?.solicitacaoId
    addLog(`Formato: ${lido.formato.toUpperCase()}${sol ? ` — Solicitação ${sol}` : ''} — ${lido.ocs.length} OC(s) no arquivo`)
    if (lido.formato === 'xml') addLog('ℹ O XML não traz a solicitação — só as datas de entrada são gravadas, sem vínculo.')
    const { validos, invalidos } = validarLote(lido.ocs, ocAcompanhamentoSchema)
    c.ignoradas = invalidos.length
    for (const { item, erros } of invalidos) addLog(`⚠ OC ${item.ocId || '?'} ignorada — ${erros.join('; ')}`)
    if (!validos.length) throw new Error('Nenhuma OC encontrada. Verifique se é um relatório de Acompanhamento de Compras.')
    const deOutro = await verificarHospitalAcomp(validos.map((v) => v.ocId), base)

    for (const item of validos) {
      const existente = base.get(item.ocId)
      if (!existente) {
        c.ausentes++
        const outro = deOutro.get(item.ocId)
        addLog(
          outro
            ? `⚠ OC ${item.ocId} está cadastrada no ${siglaHospital(outro)} — ignorada.`
            : `⚠ OC ${item.ocId} não está no sistema — importe o relatório de OCs antes.`,
        )
        continue
      }
      const patch: Partial<OC> = {}
      const notas: string[] = []

      if (item.solicitacaoId) {
        if (!existente.solicitacaoId) {
          patch.solicitacaoId = item.solicitacaoId
          notas.push(`vinculada à Solicitação ${item.solicitacaoId}`)
        } else if (existente.solicitacaoId !== item.solicitacaoId) {
          c.divergencias++
          addLog(`⚠ OC ${item.ocId}: vínculo atual Sol. ${existente.solicitacaoId} ≠ MV ${item.solicitacaoId} — mantido o atual.`)
        }
      }

      if (item.entradas.length) {
        const ultima = item.entradas[item.entradas.length - 1]
        const numeros = item.entradas.map((e) => e.numero).join(', ')
        if (existente.dataEntregaOrigem === 'manual' && existente.dataEntregaReal && existente.dataEntregaReal !== ultima.data) {
          c.divergencias++
          addLog(`⚠ OC ${item.ocId}: entrega manual ${existente.dataEntregaReal} ≠ entrada MV ${ultima.data} — mantida a manual.`)
        } else if (
          existente.dataEntregaReal !== ultima.data ||
          existente.dataEntregaOrigem !== 'mv' ||
          existente.entradaMv !== numeros ||
          existente.qtdEntradas !== item.entradas.length
        ) {
          patch.dataEntregaReal = ultima.data
          patch.dataEntregaOrigem = 'mv'
          patch.entradaMv = numeros
          patch.qtdEntradas = item.entradas.length
          const antes =
            existente.dataEntregaReal && existente.dataEntregaReal !== ultima.data && existente.dataEntregaOrigem !== 'mv'
              ? ` (era ${existente.dataEntregaReal} estimada)`
              : ''
          notas.push(`entrada ${numeros} em ${ultima.data}${antes}`)
        }
        if (item.entradas.length > 1 && !existente.dataParcial) patch.dataParcial = item.entradas[0].data
      }

      if (Object.keys(patch).length) {
        await ocRepository.atualizarCamposOC(item.ocId, patch)
        base.set(item.ocId, { ...existente, ...patch })
        if (patch.dataEntregaReal) c.entradas++
        if (patch.solicitacaoId) c.vinculos++
        addLog(`OC ${item.ocId} — ${notas.join('; ')}`)
      } else {
        c.semMudanca++
      }
    }
    return c
  }

  /** Acompanhamento em PDF — só vínculo OC ↔ Solicitação (cria a OC se não existir, comportamento antigo). */
  const importarAcompPdf = async (file: File, base: Map<number, OC>): Promise<ContagemAcomp> => {
    const c = novaContagem()
    const { extractPdfLines, parseAcompPDF } = await import('@/utils/pdf')
    const { validos: vinculos, invalidos } = validarLote(parseAcompPDF(await extractPdfLines(file)), vinculoAcompSchema)
    c.ignoradas = invalidos.length
    for (const { item, erros } of invalidos) addLog(`⚠ Vínculo OC ${item.ocId || '?'} ignorado — ${erros.join('; ')}`)
    if (!vinculos.length) throw new Error('Nenhum vínculo encontrado. Verifique se é um relatório de Acompanhamento de Compras válido.')
    const deOutro = await verificarHospitalAcomp(vinculos.map((v) => v.ocId), base)

    for (const v of vinculos) {
      const existente = base.get(v.ocId)
      const outro = deOutro.get(v.ocId)
      if (!existente && outro) {
        c.ausentes++
        addLog(`⚠ OC ${v.ocId} está cadastrada no ${siglaHospital(outro)} — ignorada.`)
        continue
      }
      if (!existente) {
        const nova: OC = {
          id: v.ocId,
          dataSolic: v.dataOC,
          fornecedorNome: v.fornecedorNome.toUpperCase(),
          fornecedorId: 0,
          sit: 'Autorizada',
          estoque: 'SUP CAF',
          solicitacaoId: v.solicitacaoId,
          cobrado: false,
          previsaoForn: null,
          previsaoForn2: null,
          dataEntregaReal: null,
          dataParcial: null,
          dataEntregaOrigem: null,
          entradaMv: '',
          qtdEntradas: 0,
          diasAtraso: 0,
          hospitalId,
          proximaAcao: null,
          motivoAtraso: null,
          ultimaMovimentacao: v.dataOC,
          previsaoDescumprida: false,
        }
        await ocRepository.criarOCImportada({
          id: nova.id,
          dataSolic: nova.dataSolic,
          fornecedorNome: nova.fornecedorNome,
          fornecedorId: 0,
          sit: nova.sit,
          estoque: 'SUP CAF',
          solicitacaoId: nova.solicitacaoId,
          previsaoForn: null,
          diasAtraso: 0,
          hospitalId,
          ultimaMovimentacao: v.dataOC,
        })
        base.set(v.ocId, nova)
        c.criadas++
      } else if (existente.solicitacaoId !== v.solicitacaoId) {
        await ocRepository.atualizarCamposOC(v.ocId, { solicitacaoId: v.solicitacaoId })
        base.set(v.ocId, { ...existente, solicitacaoId: v.solicitacaoId })
        c.vinculos++
      } else {
        c.semMudanca++
        continue
      }
      addLog(`OC ${v.ocId} — vinculada à Solicitação ${v.solicitacaoId}`)
    }
    return c
  }

  /** Um ou vários arquivos de Acompanhamento — um arquivo com erro não interrompe os outros. */
  const importarAcomp = async (files: File[]) => {
    setAtivo('acomp')
    setCardStatus('acomp', { state: 'processing' })
    setLog(files.length > 1 ? [`📚 ${files.length} arquivos de Acompanhamento`] : [])
    const base = new Map(ocs.map((o) => [o.id, o]))
    const total = novaContagem()
    let falhas = 0
    let deOutroHospital = 0
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ehPdf = /\.pdf$/i.test(file.name)
        const prefixo = files.length > 1 ? `[${i + 1}/${files.length}] ` : ''
        addLog(`📄 ${prefixo}${file.name} — ${ehPdf ? 'extraindo texto do PDF (só vínculo)...' : 'lendo relatório...'}`)
        try {
          const c = ehPdf ? await importarAcompPdf(file, base) : await importarAcompMv(file, base)
          somarContagem(total, c)
          if (files.length > 1) addLog(`  ↳ ${resumoAcomp(c) || 'nada a mudar'}`)
        } catch (err) {
          falhas++
          if (err instanceof ArquivoDeOutroHospital) {
            deOutroHospital++
            addLog(`⚠ ${file.name}: ${err.message}`)
          } else {
            addLog(`❌ ${file.name}: ${mensagemErro(err)}`)
          }
        }
      }
      if (total.entradas + total.vinculos + total.criadas === 0 && total.semMudanca > 0) {
        addLog('ℹ Nada novo — esses arquivos já parecem ter sido importados antes.')
      }
      const outrosErros = falhas - deOutroHospital
      const resumo = [
        resumoAcomp(total),
        deOutroHospital ? `${deOutroHospital} arquivo(s) de outro hospital — troque o hospital no topo` : '',
        outrosErros ? `${outrosErros} arquivo(s) com erro` : '',
      ]
        .filter(Boolean)
        .join(' | ')
      addLog(`─ Acompanhamento: ${resumo || 'nada a mudar'}`)
      const estado = falhas < files.length ? 'done' : deOutroHospital === files.length ? 'warn' : 'error'
      setCardStatus('acomp', { state: estado, message: resumo })
      await queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
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
          description="R_ORD_COM_FOR.csv — nunca regride situação; registra a entrega automaticamente quando a OC vira Atendida; previsão fica em branco pra você registrar."
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
          description="Planilha (.xlsx/.xls) ou XML do MV — grava a data de entrada real de cada OC (substitui a estimada) e o vínculo com a Solicitação. Pode selecionar vários arquivos de uma vez. PDF continua aceito só para o vínculo."
          filenameHint="Um ou vários .xlsx, .xls, .xml ou .pdf"
          accept=".xlsx,.xls,.xml,.pdf"
          accentClass="border-status-amber/30 bg-status-amber-bg text-status-amber"
          icon={ICON_PDF}
          status={status.acomp}
          disabled={processando && ativo !== 'acomp'}
          multiple
          onFiles={importarAcomp}
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
