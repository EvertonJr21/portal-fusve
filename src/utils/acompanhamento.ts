/**
 * Leitura do relatório "Acompanhamento de Compras" do SoulMV (item 79 do CLAUDE.md).
 *
 * Substitui `acompXls.ts` pra planilha e acrescenta o XML. Além do vínculo
 * OC ↔ Solicitação, o relatório traz por OC o número e a data da ENTRADA no
 * MV — a data real de recebimento que as métricas de entrega (OTIF, lead time)
 * precisam. Colunas do layout atual:
 *
 *   Ord. Com. | Dt. Ord. Com. | Dias Sol./Ord. | Fornecedor | Entrada | Dt. Entrada | Dias Ord./Entrada
 *
 * Particularidades confirmadas num export real (06/11/2026):
 * - O .xlsx é um layout de impressão com os XMLs internos em UTF-16 — o
 *   `XLSX.read` do SheetJS recusa ("Unknown Namespace"), então a planilha é
 *   aberta à mão (`lerGradeXlsx`): zip via `XLSX.CFB`, decodificação pelo BOM.
 * - A página 2 não repete o cabeçalho de solicitação, e cada página tem um
 *   rodapé com data/hora de emissão que não é dado de OC.
 * - `Entrada = 0` sem data = OC ainda sem entrada (não é "entrada no mesmo dia").
 * - O XML não traz solicitação nem data da solicitação: serve pra data de
 *   entrada, mas não faz o vínculo OC ↔ Solicitação.
 *
 * Dados vindos daqui passam por `ocAcompanhamentoSchema` (`validators.ts`)
 * antes de gravar.
 */

const RE_DATA = /^\d{2}\/\d{2}\/\d{4}$/
const RE_INTEIRO = /^\d+$/
const RE_OC_ID = /^\d{5}$/
const OC_MIN = 60000
const OC_MAX = 99999

export interface EntradaMv {
  numero: string
  data: string
}

export interface OCAcompanhamento {
  ocId: number
  dataOC: string
  fornecedorNome: string
  solicitacaoId: number | null
  dataSolicitacao: string | null
  /** Dias entre a solicitação e a OC, como o MV calculou. */
  diasSolOrd: number | null
  entradas: EntradaMv[]
}

export type FormatoAcompanhamento = 'xlsx' | 'xls' | 'xml'

export interface Acompanhamento {
  formato: FormatoAcompanhamento
  ocs: OCAcompanhamento[]
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

type Coluna = 'oc' | 'dataOC' | 'diasSolOrd' | 'fornecedor' | 'entrada' | 'dataEntrada'

const ROTULOS: Record<string, Coluna> = {
  ordcom: 'oc',
  dtordcom: 'dataOC',
  diassolord: 'diasSolOrd',
  fornecedor: 'fornecedor',
  entrada: 'entrada',
  dtentrada: 'dataEntrada',
}

function mapearCabecalho(celulas: string[]): Partial<Record<Coluna, number>> | null {
  const mapa: Partial<Record<Coluna, number>> = {}
  celulas.forEach((c, i) => {
    const col = ROTULOS[normalizar(c)]
    if (col && mapa[col] === undefined) mapa[col] = i
  })
  return mapa.oc !== undefined && mapa.dataOC !== undefined && mapa.fornecedor !== undefined ? mapa : null
}

function ocValido(valor: string | undefined): number | null {
  if (!valor || !RE_OC_ID.test(valor)) return null
  const id = parseInt(valor, 10)
  return id >= OC_MIN && id <= OC_MAX ? id : null
}

function entradaDe(numero: string | undefined, data: string | undefined): EntradaMv | null {
  const n = (numero ?? '').trim()
  const d = (data ?? '').trim()
  if (!RE_INTEIRO.test(n) || n === '0' || !RE_DATA.test(d)) return null
  return { numero: n, data: d }
}

/** Junta linhas repetidas da mesma OC (uma por entrada) num registro só. */
function acumular(mapa: Map<number, OCAcompanhamento>, oc: OCAcompanhamento) {
  const existente = mapa.get(oc.ocId)
  if (!existente) {
    mapa.set(oc.ocId, oc)
    return
  }
  for (const e of oc.entradas) {
    if (!existente.entradas.some((x) => x.numero === e.numero)) existente.entradas.push(e)
  }
  existente.solicitacaoId ??= oc.solicitacaoId
  existente.dataSolicitacao ??= oc.dataSolicitacao
}

/**
 * Lê a grade de células (linhas × colunas, posições preservadas) da planilha.
 * Com a linha de cabeçalho presente, cada valor é lido pela coluna do rótulo;
 * sem ela (layout desconhecido), cai pra busca por padrão de conteúdo, mesmo
 * princípio do parser antigo.
 */
export function parseAcompanhamentoGrade(linhas: string[][]): OCAcompanhamento[] {
  const porOC = new Map<number, OCAcompanhamento>()
  let solicitacaoId: number | null = null
  let dataSolicitacao: string | null = null
  let cabecalho: Partial<Record<Coluna, number>> | null = null
  let ultima: OCAcompanhamento | null = null

  for (const bruto of linhas) {
    const celulas = bruto.map((c) => (c ?? '').trim())
    const normal = celulas.map(normalizar)

    const iSol = normal.findIndex((c) => c.startsWith('solicitacaodecompra'))
    if (iSol !== -1) {
      const numero = celulas.slice(iSol + 1).find((c) => /^\d{3,7}$/.test(c))
      if (numero) {
        solicitacaoId = parseInt(numero, 10)
        dataSolicitacao = null
      }
    }
    const iData = normal.findIndex((c) => c.startsWith('datadasolicitacao'))
    if (iData !== -1) {
      dataSolicitacao = celulas.slice(iData + 1).find((c) => RE_DATA.test(c)) ?? dataSolicitacao
    }
    if (iSol !== -1 || iData !== -1) continue

    const novoCabecalho = mapearCabecalho(celulas)
    if (novoCabecalho) {
      cabecalho = novoCabecalho
      continue
    }

    if (cabecalho) {
      const ocId = ocValido(celulas[cabecalho.oc!])
      let entrada = entradaDe(
        cabecalho.entrada !== undefined ? celulas[cabecalho.entrada] : undefined,
        cabecalho.dataEntrada !== undefined ? celulas[cabecalho.dataEntrada] : undefined,
      )
      if (!entrada && (cabecalho.entrada === undefined || cabecalho.dataEntrada === undefined)) {
        // Cabeçalho sem as colunas de entrada (layout antigo): 1º inteiro e 1ª data depois do fornecedor.
        const depois = celulas.slice(cabecalho.fornecedor! + 1).filter(Boolean)
        const iNum = depois.findIndex((c) => RE_INTEIRO.test(c))
        if (iNum !== -1) entrada = entradaDe(depois[iNum], depois.slice(iNum + 1).find((c) => RE_DATA.test(c)))
      }
      if (ocId === null) {
        // Linha só com outra entrada da OC anterior (entrega fracionada).
        if (entrada && ultima) acumular(porOC, { ...ultima, entradas: [entrada] })
        continue
      }
      const dataOC = celulas[cabecalho.dataOC!]
      if (!RE_DATA.test(dataOC)) continue
      const dias = cabecalho.diasSolOrd !== undefined ? celulas[cabecalho.diasSolOrd] : ''
      const registro: OCAcompanhamento = {
        ocId,
        dataOC,
        fornecedorNome: celulas[cabecalho.fornecedor!] ?? '',
        solicitacaoId,
        dataSolicitacao,
        diasSolOrd: RE_INTEIRO.test(dias) ? parseInt(dias, 10) : null,
        entradas: entrada ? [entrada] : [],
      }
      acumular(porOC, registro)
      ultima = porOC.get(ocId) ?? null
      continue
    }

    // Sem cabeçalho reconhecido: OC, data da OC, fornecedor (1º texto), depois entrada + data.
    const valores = celulas.filter(Boolean)
    const iOc = valores.findIndex((c) => ocValido(c) !== null)
    if (iOc === -1) continue
    const resto = valores.slice(iOc + 1)
    const iDataOC = resto.findIndex((c) => RE_DATA.test(c))
    if (iDataOC === -1) continue
    const depoisData = resto.slice(iDataOC + 1)
    const iForn = depoisData.findIndex((c) => !RE_DATA.test(c) && !RE_INTEIRO.test(c))
    const depoisForn = iForn === -1 ? [] : depoisData.slice(iForn + 1)
    const iEntrada = depoisForn.findIndex((c) => RE_INTEIRO.test(c))
    const entrada =
      iEntrada === -1 ? null : entradaDe(depoisForn[iEntrada], depoisForn.slice(iEntrada + 1).find((c) => RE_DATA.test(c)))
    const diasAntes = iForn === -1 ? [] : depoisData.slice(0, iForn).filter((c) => RE_INTEIRO.test(c))
    acumular(porOC, {
      ocId: ocValido(valores[iOc])!,
      dataOC: resto[iDataOC],
      fornecedorNome: iForn === -1 ? '' : depoisData[iForn],
      solicitacaoId,
      dataSolicitacao,
      diasSolOrd: diasAntes.length ? parseInt(diasAntes[0], 10) : null,
      entradas: entrada ? [entrada] : [],
    })
  }

  return [...porOC.values()]
}

function tag(bloco: string, nome: string): string {
  const m = bloco.match(new RegExp(`<${nome}>([\\s\\S]*?)</${nome}>`))
  return m ? decodificarEntidades(m[1]).trim() : ''
}

function decodificarEntidades(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
}

/**
 * XML do Acompanhamento: um `<Table1>` por OC. TEXT2 = OC, TEXT22 = data da OC,
 * TEXT8 = dias Sol./Ord., TEXT1 = fornecedor, TEXT23 = entrada, TEXT16 = data
 * da entrada. Não traz a solicitação.
 */
export function parseAcompanhamentoXml(texto: string): OCAcompanhamento[] {
  const porOC = new Map<number, OCAcompanhamento>()
  for (const m of texto.matchAll(/<Table1>([\s\S]*?)<\/Table1>/g)) {
    const bloco = m[1]
    const ocId = ocValido(tag(bloco, 'TEXT2'))
    const dataOC = tag(bloco, 'TEXT22')
    if (ocId === null || !RE_DATA.test(dataOC)) continue
    const dias = tag(bloco, 'TEXT8')
    const entrada = entradaDe(tag(bloco, 'TEXT23'), tag(bloco, 'TEXT16'))
    acumular(porOC, {
      ocId,
      dataOC,
      fornecedorNome: tag(bloco, 'TEXT1'),
      solicitacaoId: null,
      dataSolicitacao: null,
      diasSolOrd: RE_INTEIRO.test(dias) ? parseInt(dias, 10) : null,
      entradas: entrada ? [entrada] : [],
    })
  }
  return [...porOC.values()]
}

/** Decodifica bytes de XML respeitando o BOM (o MV grava UTF-16 big-endian). */
export function decodificarTexto(bytes: Uint8Array): string {
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder('utf-8').decode(bytes.subarray(3))
  return new TextDecoder('utf-8').decode(bytes)
}

function indiceColuna(letras: string): number {
  let n = 0
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

interface ZipLeitor {
  ler(caminho: string): Uint8Array | null
}

/**
 * Monta a grade de células de uma planilha .xlsx sem o parser do SheetJS
 * (que não aceita o XML em UTF-16 do MV). Lê a 1ª planilha e as strings
 * compartilhadas; mantém a posição de coluna de cada célula.
 */
export function gradeDeXlsx(zip: ZipLeitor): string[][] {
  const sheet = zip.ler('xl/worksheets/sheet1.xml')
  if (!sheet) throw new Error('Planilha sem a aba principal (xl/worksheets/sheet1.xml).')
  const ssBytes = zip.ler('xl/sharedStrings.xml')
  const compartilhadas = ssBytes
    ? [...decodificarTexto(ssBytes).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
        [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodificarEntidades(t[1])).join(''),
      )
    : []

  const linhas: string[][] = []
  const xml = decodificarTexto(sheet)
  for (const c of xml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, letras, numLinha, attrs, corpo = ''] = c
    let valor: string | null = null
    if (/t="inlineStr"/.test(attrs)) {
      valor = [...corpo.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodificarEntidades(t[1])).join('')
    } else {
      const v = corpo.match(/<v>([\s\S]*?)<\/v>/)
      if (v) valor = /t="s"/.test(attrs) ? (compartilhadas[Number(v[1])] ?? '') : decodificarEntidades(v[1])
    }
    if (valor === null || valor.trim() === '') continue
    const linha = (linhas[Number(numLinha) - 1] ??= [])
    linha[indiceColuna(letras)] = valor.trim()
  }
  return linhas.filter(Boolean).map((l) => Array.from(l, (v) => v ?? ''))
}

/** Lê o arquivo enviado (.xlsx, .xls ou .xml) e devolve as OCs do Acompanhamento. */
export async function lerAcompanhamento(file: File): Promise<Acompanhamento> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const nome = file.name.toLowerCase()

  if (nome.endsWith('.xml')) {
    return { formato: 'xml', ocs: parseAcompanhamentoXml(decodificarTexto(buf)) }
  }

  const modulo = await import('xlsx')
  // Build ESM (Vite) expõe CFB/read como exports nomeados; o CJS (Node, testes) só via `default`.
  const XLSX = 'CFB' in modulo && modulo.CFB ? modulo : (modulo as unknown as { default: typeof modulo }).default
  if (nome.endsWith('.xlsx')) {
    const cfb = XLSX.CFB.read(buf, { type: 'buffer' })
    const zip: ZipLeitor = {
      ler(caminho) {
        const i = cfb.FullPaths.findIndex((p: string) => p.toLowerCase().endsWith(`/${caminho.toLowerCase()}`))
        const conteudo = i === -1 ? null : cfb.FileIndex[i].content
        return conteudo ? new Uint8Array(conteudo as ArrayLike<number>) : null
      },
    }
    return { formato: 'xlsx', ocs: parseAcompanhamentoGrade(gradeDeXlsx(zip)) }
  }

  // .xls antigo (binário): o SheetJS lê normalmente.
  const workbook = XLSX.read(buf, { type: 'array' })
  const planilha = workbook.Sheets[workbook.SheetNames[0]]
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(planilha, { header: 1, raw: false, defval: '' })
  return { formato: 'xls', ocs: parseAcompanhamentoGrade(linhas.map((l) => l.map((c) => String(c ?? '').trim()))) }
}
