import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { UploadCard, type UploadStatus } from '@/components/ocs/UploadCard'
import { Button } from '@/components/ui/Button'
import { useHospital } from '@/hooks/useHospital'
import { useOCs } from '@/hooks/useOCs'
import { useSols } from '@/hooks/useSols'
import * as ocRepository from '@/repositories/ocRepository'
import * as solRepository from '@/repositories/solRepository'
import type { OC, Solicitacao } from '@/types'
import { decodeFile, parseOCsCSV, parseSolsCSV } from '@/utils/csv'
import { fmt, getHoje } from '@/utils/date'
import { emLotes, emParalelo, logOCNova, planejarOCs, planejarSols, type PlanoOCs, type PlanoSols } from '@/utils/importacaoPlano'
import { avaliarHospitalDoArquivo, avisoArquivoDeOutroHospital, mensagemErro, siglaHospital } from '@/utils/importacaoHospital'
import { ocAcompanhamentoSchema, ocImportadaSchema, solImportadaSchema, validarLote, vinculoAcompSchema } from '@/utils/validators'

type Relatorio = 'ocs' | 'sols' | 'acomp'

/** Arquivo de Acompanhamento de outro hospital — vira aviso, não erro. */
class ArquivoDeOutroHospital extends Error {}

/** OCs/solicitações novas por chamada ao banco. */
const TAMANHO_LOTE = 200
/** Atualizações (e a repescagem linha a linha de um lote que falhou) simultâneas. */
const PARALELAS = 6

/** Plano montado e ainda não gravado — o que a prévia mostra antes de confirmar. */
type Previa =
  | { tipo: 'ocs'; arquivo: string; plano: PlanoOCs; invalidos: number }
  | { tipo: 'sols'; arquivo: string; plano: PlanoSols; invalidos: number }

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

  const [previa, setPrevia] = useState<Previa | null>(null)

  const addLog = (linha: string) => setLog((l) => [...l, linha])
  const addLogs = (linhas: string[]) => {
    if (linhas.length) setLog((l) => [...l, ...linhas])
  }
  const setCardStatus = (key: Relatorio, s: UploadStatus) => setStatus((prev) => ({ ...prev, [key]: s }))

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [log])

  /** Hospital errado → aviso âmbar no card, nada gravado. Devolve true se interrompeu. */
  const barrarOutroHospital = (rel: 'ocs' | 'sols', aval: ReturnType<typeof avaliarHospitalDoArquivo>, tipo: string): boolean => {
    if (!aval.arquivoEhDeOutro || !aval.outroHospital) return false
    const aviso = avisoArquivoDeOutroHospital(aval.outroHospital, hospitalId, aval.deOutro.size, tipo)
    addLog(`⚠ ${aviso}`)
    setCardStatus(rel, { state: 'warn', message: aviso })
    setAtivo(null)
    return true
  }

  /**
   * 1ª etapa (OCs e Solicitações): lê o arquivo e monta o plano, sem gravar. Se
   * houver o que gravar, mostra a prévia e espera a confirmação; se não houver,
   * encerra na hora.
   */
  const prepararOCs = async (file: File) => {
    setAtivo('ocs')
    setCardStatus('ocs', { state: 'processing' })
    setLog([`📄 ${file.name}`])
    try {
      const texto = await decodeFile(file)
      const { validos: itens, invalidos } = validarLote(parseOCsCSV(texto), ocImportadaSchema)
      addLogs(invalidos.map(({ item, erros }) => `⚠ OC ${item.id || '?'} ignorada — ${erros.join('; ')}`))
      const existentes = new Map(ocs.map((o) => [o.id, o]))
      const fora = [...new Set(itens.filter((i) => !existentes.has(i.id)).map((i) => i.id))]
      const aval = avaliarHospitalDoArquivo(
        new Set(itens.map((i) => i.id)).size - fora.length,
        fora.length ? await ocRepository.hospitaisDasOCs(fora) : new Map(),
        hospitalId,
      )
      if (barrarOutroHospital('ocs', aval, 'OC(s)')) return
      const plano = planejarOCs(itens, existentes, aval.deOutro, hospitalId, fmt(getHoje()))
      const previa: Previa = { tipo: 'ocs', arquivo: file.name, plano, invalidos: invalidos.length }
      if (plano.novas.length + plano.atualizacoes.length === 0) await gravarOCs(previa)
      else {
        setPrevia(previa)
        setCardStatus('ocs', { state: 'processing', message: 'Aguardando sua confirmação logo abaixo.' })
      }
    } catch (err) {
      falhar('ocs', err)
    }
  }

  const prepararSols = async (file: File) => {
    setAtivo('sols')
    setCardStatus('sols', { state: 'processing' })
    setLog([`📄 ${file.name}`])
    try {
      const texto = await decodeFile(file)
      const { validos: itens, invalidos } = validarLote(parseSolsCSV(texto, hospitalId), solImportadaSchema)
      addLogs(invalidos.map(({ item, erros }) => `⚠ Solicitação ${item.id || '?'} ignorada — ${erros.join('; ')}`))
      const existentes = new Map(sols.map((x) => [x.id, x]))
      const fora = [...new Set(itens.filter((i) => !existentes.has(i.id)).map((i) => i.id))]
      const aval = avaliarHospitalDoArquivo(
        new Set(itens.map((i) => i.id)).size - fora.length,
        fora.length ? await solRepository.hospitaisDasSols(fora) : new Map(),
        hospitalId,
      )
      if (barrarOutroHospital('sols', aval, 'solicitação(ões)')) return
      const plano = planejarSols(itens, existentes, aval.deOutro, hospitalId)
      const previa: Previa = { tipo: 'sols', arquivo: file.name, plano, invalidos: invalidos.length }
      if (plano.novas.length + plano.atualizacoes.length === 0) await gravarSols(previa)
      else {
        setPrevia(previa)
        setCardStatus('sols', { state: 'processing', message: 'Aguardando sua confirmação logo abaixo.' })
      }
    } catch (err) {
      falhar('sols', err)
    }
  }

  const falhar = (rel: Relatorio, err: unknown) => {
    const msg = mensagemErro(err)
    addLog(`❌ Erro: ${msg}`)
    setCardStatus(rel, { state: 'error', message: msg })
    setPrevia(null)
    setAtivo(null)
  }

  /**
   * Grava as novas em lotes (uma chamada por lote, não uma por linha). Se um lote
   * falhar, tenta aquele lote linha a linha pra isolar a que tem problema — as
   * outras entram normalmente. Devolve quantas falharam.
   */
  const gravarNovas = async <T extends { id: number }>(
    novas: T[],
    emLote: (lote: T[]) => Promise<void>,
    umaAUma: (item: T) => Promise<void>,
    texto: (item: T) => string,
    nome: string,
  ): Promise<number> => {
    let falhas = 0
    for (const lote of emLotes(novas, TAMANHO_LOTE)) {
      try {
        await emLote(lote)
        addLogs(lote.map(texto))
      } catch {
        const erros = await emParalelo(lote, PARALELAS, umaAUma)
        addLogs(lote.map((item, i) => (erros[i] ? `❌ ${nome} ${item.id} — ${mensagemErro(erros[i])}` : texto(item))))
        falhas += erros.filter(Boolean).length
      }
    }
    return falhas
  }

  /** Atualizações são poucas e diferentes entre si: vão uma a uma, várias ao mesmo tempo. */
  const gravarAtualizacoes = async <T,>(
    atualizacoes: { id: number; patch: Partial<T>; log: string }[],
    gravar: (id: number, patch: Partial<T>) => Promise<void>,
    nome: string,
  ): Promise<number> => {
    let falhas = 0
    for (const lote of emLotes(atualizacoes, TAMANHO_LOTE)) {
      const erros = await emParalelo(lote, PARALELAS, (a) => gravar(a.id, a.patch))
      addLogs(lote.map((a, i) => (erros[i] ? `❌ ${nome} ${a.id} — ${mensagemErro(erros[i])}` : a.log)))
      falhas += erros.filter(Boolean).length
    }
    return falhas
  }

  const resumoFinal = (novas: number, atualizadas: number, p: Previa, falhas: number) =>
    [
      `${novas} novas`,
      `${atualizadas} atualizadas`,
      `${p.plano.semMudanca} sem mudança`,
      p.plano.outroHospital.length ? `${p.plano.outroHospital.length} de outro hospital` : '',
      p.invalidos ? `${p.invalidos} ignoradas (formato inválido)` : '',
      falhas ? `${falhas} com erro` : '',
    ]
      .filter(Boolean)
      .join(' | ')

  const gravarOCs = async (p: Previa & { tipo: 'ocs' }) => {
    setPrevia(null)
    try {
      addLogs(p.plano.outroHospital.map((f) => `⚠ OC ${f.id} já está cadastrada no ${siglaHospital(f.hospital)} — ignorada.`))
      const falhasNovas = await gravarNovas(p.plano.novas, ocRepository.criarOCsImportadas, ocRepository.criarOCImportada, logOCNova, 'OC')
      const falhasAtu = await gravarAtualizacoes<OC>(p.plano.atualizacoes, ocRepository.atualizarCamposOC, 'OC')
      const novas = p.plano.novas.length - falhasNovas
      const atualizadas = p.plano.atualizacoes.length - falhasAtu
      if (novas === 0 && atualizadas === 0 && p.plano.semMudanca > 0) {
        addLog('ℹ Nenhuma OC nova ou alterada — esse arquivo já parece ter sido importado antes.')
      }
      const resumo = resumoFinal(novas, atualizadas, p, falhasNovas + falhasAtu)
      addLog(`─ OCs CSV: ${resumo}`)
      setCardStatus('ocs', { state: 'done', message: resumo })
      await queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
      setAtivo(null)
    } catch (err) {
      falhar('ocs', err)
    }
  }

  const gravarSols = async (p: Previa & { tipo: 'sols' }) => {
    setPrevia(null)
    try {
      addLogs(p.plano.outroHospital.map((f) => `⚠ Solicitação ${f.id} já está cadastrada no ${siglaHospital(f.hospital)} — ignorada.`))
      const falhasNovas = await gravarNovas(
        p.plano.novas,
        solRepository.salvarSols,
        solRepository.salvarSol,
        (n) => `Solicitação ${n.id} — ${n.sit} (nova)`,
        'Solicitação',
      )
      const falhasAtu = await gravarAtualizacoes<Solicitacao>(p.plano.atualizacoes, solRepository.atualizarCamposSol, 'Solicitação')
      const novas = p.plano.novas.length - falhasNovas
      const atualizadas = p.plano.atualizacoes.length - falhasAtu
      if (novas === 0 && atualizadas === 0 && p.plano.semMudanca > 0) {
        addLog('ℹ Nenhuma solicitação nova ou alterada — esse arquivo já parece ter sido importado antes.')
      }
      const resumo = resumoFinal(novas, atualizadas, p, falhasNovas + falhasAtu)
      addLog(`─ Solicitações CSV: ${resumo}`)
      setCardStatus('sols', { state: 'done', message: resumo })
      await queryClient.invalidateQueries({ queryKey: ['sols', hospitalId] })
      setAtivo(null)
    } catch (err) {
      falhar('sols', err)
    }
  }

  const confirmarPrevia = () => {
    if (!previa) return
    if (previa.tipo === 'ocs') void gravarOCs(previa)
    else void gravarSols(previa)
  }

  const cancelarPrevia = () => {
    if (!previa) return
    addLog('─ Importação cancelada — nada foi gravado.')
    setCardStatus(previa.tipo, { state: 'idle' })
    setPrevia(null)
    setAtivo(null)
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
          description="R_ORD_COM_FOR.csv — mostra uma prévia antes de gravar; nunca regride situação; registra a entrega automaticamente quando a OC vira Atendida; previsão fica em branco pra você registrar."
          filenameHint="Arquivo .csv"
          accept=".csv"
          accentClass="border-status-blue/30 bg-status-blue-bg text-status-blue"
          icon={ICON_OCS}
          status={status.ocs}
          disabled={processando && ativo !== 'ocs'}
          onFile={prepararOCs}
        />
        <UploadCard
          title="Solicitações"
          description="R_SOL_PEND_DATA.csv — mostra uma prévia antes de gravar; só preenche campos vazios de solicitações já existentes."
          filenameHint="Arquivo .csv"
          accept=".csv"
          accentClass="border-status-purple/30 bg-status-purple-bg text-status-purple"
          icon={ICON_SOLS}
          status={status.sols}
          disabled={processando && ativo !== 'sols'}
          onFile={prepararSols}
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

      {previa && <PainelPrevia previa={previa} onConfirmar={confirmarPrevia} onCancelar={cancelarPrevia} />}

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

interface PainelPreviaProps {
  previa: Previa
  onConfirmar: () => void
  onCancelar: () => void
}

/** Prévia da importação: o que vai acontecer com cada linha do arquivo, antes de gravar. */
function PainelPrevia({ previa, onConfirmar, onCancelar }: PainelPreviaProps) {
  const { plano } = previa
  const ehOC = previa.tipo === 'ocs'
  const nome = ehOC ? 'OC(s)' : 'solicitação(ões)'
  const hospitais = [...new Set(plano.outroHospital.map((f) => siglaHospital(f.hospital)))].join('/')
  const detalheAtu = ehOC
    ? `${previa.plano.mudamSituacao} mudam de situação`
    : 'preenchem campo que estava vazio'
  const ids = (lista: { id: number }[]) => {
    const amostra = lista.slice(0, 12).map((x) => x.id).join(', ')
    return lista.length > 12 ? `${amostra} e mais ${lista.length - 12}` : amostra
  }

  return (
    <div className="rounded-xl border border-status-blue/30 bg-status-blue-bg/40 p-4 shadow-soft-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Prévia da importação — nada foi gravado ainda</h3>
          <p className="mt-0.5 text-xs text-slate-500">{previa.arquivo}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button onClick={onConfirmar}>Confirmar importação</Button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <CaixaPrevia valor={plano.novas.length} rotulo={`${nome} nova(s)`} destaque />
        <CaixaPrevia valor={plano.atualizacoes.length} rotulo="atualização(ões)" destaque />
        <CaixaPrevia valor={plano.semMudanca} rotulo="sem mudança" />
        <CaixaPrevia valor={plano.outroHospital.length} rotulo={hospitais ? `do ${hospitais} — puladas` : 'de outro hospital'} alerta={plano.outroHospital.length > 0} />
        <CaixaPrevia valor={previa.invalidos} rotulo="com formato inválido" alerta={previa.invalidos > 0} />
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-xs text-slate-600">
        {plano.novas.length > 0 && (
          <li>
            <span className="font-medium text-slate-700">Novas:</span> {ids(plano.novas)}
          </li>
        )}
        {plano.atualizacoes.length > 0 && (
          <li>
            <span className="font-medium text-slate-700">Atualizações ({detalheAtu}):</span> {ids(plano.atualizacoes)}
          </li>
        )}
        {plano.outroHospital.length > 0 && (
          <li>
            <span className="font-medium text-slate-700">Puladas (outro hospital):</span> {ids(plano.outroHospital)}
          </li>
        )}
      </ul>
    </div>
  )
}

function CaixaPrevia({ valor, rotulo, destaque, alerta }: { valor: number; rotulo: string; destaque?: boolean; alerta?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className={`text-xl font-bold tabular-nums ${alerta ? 'text-status-amber' : destaque && valor > 0 ? 'text-status-blue' : 'text-slate-700'}`}>{valor}</div>
      <div className="text-[11px] leading-tight text-slate-500">{rotulo}</div>
    </div>
  )
}
