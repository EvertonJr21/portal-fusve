import { jsPDF } from 'jspdf'
import { autoTable, type UserOptions } from 'jspdf-autotable'
import { HOSPITAIS, type HospitalId } from '@/constants'
import type { ContratoComodato, ContratoHeader, ContratoProduto } from '@/types'
import { marcosVigencia, pontosDeAtencaoContrato, statusVigencia, textoVigencia } from './contrato'
import { fmt, getHoje } from './date'
import { abrirDocPdf } from './pdfDataUrl'

/**
 * Relatórios de contratos para impressão (itens 110/111) — pra levar à
 * gerência. Desenho de documento corporativo: cabeçalho institucional com
 * bloco de metadados, quadro-resumo, linha do tempo da vigência, seções
 * numeradas com campos em grade, tabelas só com linhas finas, cabeçalho
 * corrido nas páginas seguintes e rodapé com emissão e paginação.
 * Ordem do conteúdo segue os resumos de contrato dos CLMs: o que decide
 * primeiro (situação, vigência, pontos de atenção), depois os termos, depois
 * o detalhe e a ciência. Carregado sob demanda (`await import`).
 */

type RGB = [number, number, number]
const NAVY: RGB = [17, 45, 78]
const TINTA: RGB = [17, 24, 39]
const SUAVE: RGB = [100, 110, 125]
const FIO: RGB = [214, 219, 226]
const PAINEL: RGB = [245, 247, 250]
const VERDE: RGB = [22, 101, 52]
const AMBAR: RGB = [161, 98, 7]
const VERMELHO: RGB = [153, 27, 27]
const FUNDO_VERMELHO: RGB = [254, 242, 242]
const FUNDO_AMBAR: RGB = [255, 251, 235]
const FUNDO_VERDE: RGB = [240, 253, 244]

const FUSVE_NOME = 'Fundação Educacional Severino Sombra'
const FUSVE_CNPJ = '32.410.037/0001-84'
const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const M = 18 // margem lateral
const TOPO_CONTINUACAO = 26
const BASE = 20 // espaço reservado ao rodapé

const dataBR = (iso: string | null) => {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}
const ou = (v: string | number | null | undefined, sufixo = '') => (v === null || v === undefined || v === '' ? '—' : `${v}${sufixo}`)
const siglaHospital = (h: HospitalId | 'ambos') => (h === 'ambos' ? 'HUV e HMK' : HOSPITAIS[h].sigla)
const nomeHospital = (h: HospitalId | 'ambos') => (h === 'ambos' ? 'HUV e HMK' : HOSPITAIS[h].nomeCompleto)
const largura = (doc: jsPDF) => doc.internal.pageSize.getWidth()
const altura = (doc: jsPDF) => doc.internal.pageSize.getHeight()
const conteudo = (doc: jsPDF) => largura(doc) - 2 * M
const fimTabela = (doc: jsPDF) => (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

function corVigencia(c: ContratoHeader): RGB {
  const s = statusVigencia(c)
  return s === 'vencido' || s === 'critico' ? VERMELHO : s === 'atencao' ? AMBAR : s === 'ok' ? VERDE : SUAVE
}
function corStatus(status: string): RGB {
  return status === 'Ativo' ? VERDE : status === 'Em Negociação' ? AMBAR : status === 'Suspenso' ? VERMELHO : SUAVE
}

/** Rótulo em versalete (caixa alta, espaçado). */
function rotulo(doc: jsPDF, t: string, x: number, y: number, opts: { cor?: RGB; tam?: number; align?: 'left' | 'right' | 'center' } = {}) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(opts.tam ?? 6.5)
  doc.setTextColor(...(opts.cor ?? SUAVE))
  // jsPDF não conta o espaçamento entre letras no alinhamento: calcula a largura real.
  const cs = 0.35
  const s = t.toUpperCase()
  const w = doc.getTextWidth(s) + cs * Math.max(0, s.length - 1)
  const x0 = opts.align === 'right' ? x - w : opts.align === 'center' ? x - w / 2 : x
  doc.setCharSpace(cs)
  doc.text(s, x0, y)
  doc.setCharSpace(0)
}

function texto(doc: jsPDF, t: string, x: number, y: number, opts: { tam?: number; cor?: RGB; negrito?: boolean; align?: 'left' | 'right' | 'center' } = {}) {
  doc.setFont('helvetica', opts.negrito ? 'bold' : 'normal')
  doc.setFontSize(opts.tam ?? 8.8)
  doc.setTextColor(...(opts.cor ?? TINTA))
  doc.text(t, x, y, { align: opts.align ?? 'left' })
}

/** Se não couber `espaco` mm antes do rodapé, abre página nova. Devolve o y a usar. */
function garantir(doc: jsPDF, y: number, espaco: number): number {
  if (y + espaco <= altura(doc) - BASE) return y
  doc.addPage()
  return TOPO_CONTINUACAO + 4
}

/** Cabeçalho institucional da 1ª página. Devolve o y logo abaixo. */
function cabecalhoDocumento(doc: jsPDF, tipo: string, titulo: string, subtitulo: string, meta: [string, string][]): number {
  const W = largura(doc)
  texto(doc, 'FUSVE', M, 14, { tam: 11, negrito: true, cor: NAVY })
  texto(doc, FUSVE_NOME, M + 14, 14, { tam: 8, cor: SUAVE })
  rotulo(doc, 'Setor de Compras', W - M, 14, { align: 'right' })
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.8)
  doc.line(M, 17.5, W - M, 17.5)

  const larguraMeta = 46
  rotulo(doc, tipo, M, 27, { cor: NAVY, tam: 7 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  const linhas = (doc.splitTextToSize(titulo, conteudo(doc) - larguraMeta - 8) as string[]).slice(0, 2)
  doc.setTextColor(...TINTA)
  doc.text(linhas, M, 35)
  let yTitulo = 35 + (linhas.length - 1) * 7.2
  if (subtitulo) {
    yTitulo += 6
    texto(doc, (doc.splitTextToSize(subtitulo, conteudo(doc) - larguraMeta - 8) as string[])[0], M, yTitulo, { tam: 9.5, cor: SUAVE })
  }

  // Bloco de metadados à direita, separado por um fio vertical.
  const xMeta = W - M - larguraMeta
  doc.setDrawColor(...FIO)
  doc.setLineWidth(0.2)
  doc.line(xMeta - 4, 23, xMeta - 4, 23 + meta.length * 8.5)
  meta.forEach(([r, v], i) => {
    const yy = 26.5 + i * 8.5
    rotulo(doc, r, xMeta, yy, { tam: 6 })
    texto(doc, (doc.splitTextToSize(v, larguraMeta) as string[])[0], xMeta, yy + 4, { tam: 8.5, negrito: true })
  })
  return Math.max(yTitulo, 23 + meta.length * 8.5) + 6
}

/** Selo de situação com contorno (sem preenchimento chapado). Devolve o x seguinte. */
function selo(doc: jsPDF, x: number, y: number, t: string, cor: RGB): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  const w = doc.getTextWidth(t.toUpperCase()) + 0.3 * (t.length - 1) + 6
  doc.setCharSpace(0.3)
  doc.setDrawColor(...cor)
  doc.setLineWidth(0.35)
  doc.roundedRect(x, y - 3.7, w, 5.4, 2.7, 2.7, 'S')
  doc.setTextColor(...cor)
  doc.text(t.toUpperCase(), x + 3, y)
  doc.setCharSpace(0)
  return x + w + 2.5
}

interface Celula {
  rotulo: string
  valor: string
  detalhe?: string
  cor?: RGB
}

/** Quadro-resumo: painel cinza-claro em grade, com fios entre as células. */
function quadroResumo(doc: jsPDF, y: number, celulas: Celula[], colunas: number, alturaLinha = 18, tamValor = 10.5): number {
  const W = conteudo(doc)
  const linhas = Math.ceil(celulas.length / colunas)
  const cw = W / colunas
  doc.setFillColor(...PAINEL)
  doc.setDrawColor(...FIO)
  doc.setLineWidth(0.2)
  doc.roundedRect(M, y, W, linhas * alturaLinha, 1.5, 1.5, 'FD')
  for (let i = 1; i < colunas; i++) doc.line(M + i * cw, y + 3, M + i * cw, y + linhas * alturaLinha - 3)
  for (let r = 1; r < linhas; r++) doc.line(M + 3, y + r * alturaLinha, M + W - 3, y + r * alturaLinha)
  celulas.forEach((c, i) => {
    const x = M + (i % colunas) * cw + 4
    const yy = y + Math.floor(i / colunas) * alturaLinha
    rotulo(doc, c.rotulo, x, yy + 5.5, { tam: 6 })
    doc.setFont('helvetica', 'bold')
    let tam = tamValor
    doc.setFontSize(tam)
    while (doc.getTextWidth(c.valor) > cw - 8 && tam > 7.5) doc.setFontSize((tam -= 0.5))
    texto(doc, (doc.splitTextToSize(c.valor, cw - 8) as string[])[0], x, yy + 11.5, { tam, negrito: true, cor: c.cor ?? TINTA })
    if (c.detalhe) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      texto(doc, (doc.splitTextToSize(c.detalhe, cw - 8) as string[])[0], x, yy + 15.5, { tam: 7, cor: SUAVE })
    }
  })
  return y + linhas * alturaLinha
}

/** Linha do tempo da vigência: início, aviso de renovação, hoje e término. */
function linhaDoTempo(doc: jsPDF, y: number, c: ContratoHeader): number {
  const m = marcosVigencia(c, getHoje())
  const inicio = m.inicio
  const fim = m.fim
  if (!inicio || !fim || m.pctDecorrido === null || !m.duracaoDias) return y
  const W = conteudo(doc)
  const posicao = (d: Date) => M + Math.min(1, Math.max(0, (d.getTime() - inicio.getTime()) / (fim.getTime() - inicio.getTime()))) * W
  const yb = y + 9
  rotulo(doc, 'Linha do tempo da vigência', M, y + 1)
  texto(doc, `${m.pctDecorrido}% decorrido · ${m.duracaoDias} dias de vigência`, M + W, y + 1, { tam: 7, cor: SUAVE, align: 'right' })
  doc.setDrawColor(...FIO)
  doc.setLineWidth(1.4)
  doc.line(M, yb, M + W, yb)
  doc.setDrawColor(...corVigencia(c))
  if (m.pctDecorrido > 0) doc.line(M, yb, posicao(getHoje()), yb)
  const marco = (x: number) => {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.5)
    doc.circle(x, yb, 1.4, 'FD')
  }
  marco(M)
  marco(M + W)
  texto(doc, `Início ${fmt(inicio)}`, M, yb + 5.5, { tam: 7, cor: SUAVE })
  texto(doc, `Término ${fmt(fim)}`, M + W, yb + 5.5, { tam: 7, cor: SUAVE, align: 'right' })
  if (m.avisoEm && m.avisoEm > inicio) {
    const xa = posicao(m.avisoEm)
    doc.setFillColor(...AMBAR)
    doc.triangle(xa, yb - 1.4, xa - 1.5, yb - 3.7, xa + 1.5, yb - 3.7, 'F')
    const alinhar = xa > M + W - 40 ? 'right' : xa < M + 40 ? 'left' : 'center'
    texto(doc, `Decidir a renovação até ${fmt(m.avisoEm)}`, xa, yb - 5, { tam: 7, cor: AMBAR, align: alinhar })
  }
  if (m.pctDecorrido > 0 && m.pctDecorrido < 100) {
    const xh = posicao(getHoje())
    doc.setFillColor(...corVigencia(c))
    doc.circle(xh, yb, 1.1, 'F')
    if (xh > M + 25 && xh < M + W - 25) texto(doc, 'Hoje', xh, yb + 5.5, { tam: 7, negrito: true, cor: corVigencia(c), align: 'center' })
  }
  doc.setLineWidth(0.2)
  return yb + 9
}

/** Título de seção: número em azul, título em versalete e fio fino. */
function tituloSecao(doc: jsPDF, y: number, numero: string, titulo: string, espacoMin = 24): number {
  y = garantir(doc, y, espacoMin)
  let x = M
  if (numero) {
    texto(doc, numero, M, y, { tam: 9, negrito: true, cor: NAVY })
    x = M + 8
  }
  rotulo(doc, titulo, x, y, { cor: TINTA, tam: 8 })
  doc.setDrawColor(...FIO)
  doc.setLineWidth(0.25)
  doc.line(M, y + 2.6, largura(doc) - M, y + 2.6)
  return y + 8
}

/** Campos em grade (rótulo em cima, valor embaixo), com quebra de linha e de página. */
function grade(doc: jsPDF, y: number, campos: [string, string][], colunas: number): number {
  const cw = conteudo(doc) / colunas
  for (let i = 0; i < campos.length; i += colunas) {
    const linha = campos.slice(i, i + colunas)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.8)
    const valores = linha.map(([, v]) => doc.splitTextToSize(v || '—', cw - 6) as string[])
    const h = 5 + Math.max(...valores.map((v) => v.length)) * 4 + 3.5
    y = garantir(doc, y, h)
    linha.forEach(([r], j) => {
      if (!r) return
      const x = M + j * cw
      rotulo(doc, r, x, y + 2.5, { tam: 6 })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.8)
      doc.setTextColor(...TINTA)
      doc.text(valores[j], x, y + 7)
    })
    y += h
  }
  return y + 2
}

/** Estilo comum das tabelas: cabeçalho em painel claro, só fios horizontais. */
function estiloTabela(extra: Partial<UserOptions>): UserOptions {
  return {
    theme: 'plain',
    margin: { left: M, right: M, top: TOPO_CONTINUACAO + 2, bottom: BASE + 2 },
    headStyles: { fillColor: PAINEL, textColor: NAVY, fontStyle: 'bold', fontSize: 6.8, cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 } },
    bodyStyles: { fontSize: 8, textColor: TINTA, cellPadding: { top: 1.9, bottom: 1.9, left: 2, right: 2 }, lineColor: FIO, lineWidth: { bottom: 0.15 } },
    footStyles: { fillColor: [255, 255, 255], textColor: TINTA, fontStyle: 'bold', fontSize: 8, cellPadding: { top: 2.2, bottom: 1.5, left: 2, right: 2 } },
    showHead: 'everyPage',
    ...extra,
  }
}

/** Cabeçalho corrido (páginas 2+) e rodapé com emissão e paginação em todas. */
function moldura(doc: jsPDF, tituloCorrido: string, nome: string) {
  const total = doc.getNumberOfPages()
  const W = largura(doc)
  const H = altura(doc)
  const agora = new Date()
  const emissao = `${fmt(getHoje())} às ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    if (i > 1) {
      texto(doc, 'FUSVE', M, 14, { tam: 8.5, negrito: true, cor: NAVY })
      rotulo(doc, tituloCorrido, M + 11, 14, { tam: 6.2 })
      texto(doc, (doc.splitTextToSize(nome, W / 2 - M) as string[])[0], W - M, 14, { tam: 7.5, cor: SUAVE, align: 'right' })
      doc.setDrawColor(...FIO)
      doc.setLineWidth(0.25)
      doc.line(M, 17, W - M, 17)
    }
    doc.setDrawColor(...FIO)
    doc.setLineWidth(0.25)
    doc.line(M, H - 13, W - M, H - 13)
    texto(doc, `Documento de uso interno · Portal FUSVE · emitido em ${emissao}`, M, H - 8.5, { tam: 6.8, cor: SUAVE })
    texto(doc, `Página ${i} de ${total}`, W - M, H - 8.5, { tam: 6.8, cor: SUAVE, align: 'right' })
  }
}

export interface DadosResumoContrato {
  contrato: ContratoHeader
  produtos: ContratoProduto[]
  comodatos: ContratoComodato[]
}

/** Resumo executivo de um contrato/acordo, pronto para imprimir ou salvar em PDF. */
export function gerarResumoContratoPDF({ contrato: c, produtos, comodatos }: DadosResumoContrato) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = conteudo(doc)
  const nome = c.titulo || c.fornecedorNome
  const tipoDoc = c.tipo === 'Acordo Comercial' ? 'Resumo executivo de acordo comercial' : 'Resumo executivo de contrato'
  const m = marcosVigencia(c, getHoje())
  const semPreco = produtos.filter((p) => !p.precoUnitario).length
  const qtdComodato = comodatos.reduce((s, x) => s + x.quantidade, 0)
  const valorComodato = comodatos.reduce((s, x) => s + (x.valorEstimado ?? 0) * x.quantidade, 0)

  let y = cabecalhoDocumento(doc, tipoDoc, nome, c.titulo ? c.fornecedorNome : '', [
    ['Emissão', fmt(getHoje())],
    ['Unidade', siglaHospital(c.hospitalId)],
    ['Classificação', ou(c.classificacao)],
  ])

  let x = selo(doc, M, y, c.status, corStatus(c.status))
  x = selo(doc, x, y, textoVigencia(c.vigenciaFim), corVigencia(c))
  selo(doc, x, y, c.tipo, SUAVE)
  y += 6

  y = quadroResumo(
    doc,
    y,
    [
      { rotulo: 'Início da vigência', valor: dataBR(c.vigenciaInicio), detalhe: m.duracaoDias ? `${m.duracaoDias} dias de vigência` : undefined },
      { rotulo: 'Término da vigência', valor: dataBR(c.vigenciaFim), detalhe: textoVigencia(c.vigenciaFim), cor: corVigencia(c) },
      { rotulo: 'Renovação', valor: c.renovacaoAutomatica ? 'Automática' : 'Manual', detalhe: `aviso ${c.avisoRenovacaoDias} dias antes` },
      { rotulo: 'Prazo de entrega', valor: c.prazoMedioDias !== null ? `${c.prazoMedioDias} dias` : '—', detalhe: c.freteTipo ? `Frete ${c.freteTipo}` : undefined },
      { rotulo: 'Condição de pagamento', valor: ou(c.condicaoPagamento) },
      { rotulo: 'Reajuste', valor: ou(c.reajusteRegra) },
      {
        rotulo: 'Itens contratados',
        valor: String(produtos.length),
        detalhe: produtos.length ? (semPreco ? `${semPreco} sem preço` : 'todos com preço') : 'nenhum cadastrado',
        cor: semPreco ? AMBAR : TINTA,
      },
      {
        rotulo: 'Equip. em comodato',
        valor: qtdComodato ? String(qtdComodato) : 'Nenhum',
        detalhe: valorComodato ? `${MOEDA.format(valorComodato)} estimados` : undefined,
      },
    ],
    4,
  )
  y += 7
  y = linhaDoTempo(doc, y, c) + 3

  // Pontos de atenção — caixa com faixa lateral colorida.
  const pontos = pontosDeAtencaoContrato(c, { produtos, temPdfAssinado: !!c.pdfPath })
  const temAlto = pontos.some((p) => p.nivel === 'alto')
  const corCaixa = !pontos.length ? VERDE : temAlto ? VERMELHO : AMBAR
  const fundoCaixa = !pontos.length ? FUNDO_VERDE : temAlto ? FUNDO_VERMELHO : FUNDO_AMBAR
  const hCaixa = 9 + Math.max(1, pontos.length) * 5
  y = garantir(doc, y, hCaixa + 2)
  doc.setFillColor(...fundoCaixa)
  doc.rect(M, y, W, hCaixa, 'F')
  doc.setFillColor(...corCaixa)
  doc.rect(M, y, 1.2, hCaixa, 'F')
  rotulo(doc, pontos.length ? `Pontos de atenção (${pontos.length})` : 'Pontos de atenção', M + 5, y + 5.5, { cor: corCaixa, tam: 6.8 })
  if (!pontos.length) texto(doc, 'Nenhum: vigência em dia, preços e cadastro completos, contrato assinado anexado.', M + 5, y + 11, { tam: 8.5 })
  pontos.forEach((p, i) => {
    const yy = y + 11 + i * 5
    doc.setFillColor(...(p.nivel === 'alto' ? VERMELHO : AMBAR))
    doc.rect(M + 5, yy - 2.2, 1.6, 1.6, 'F')
    texto(doc, p.texto, M + 9, yy, { tam: 8.5 })
  })
  y += hCaixa + 10

  let n = 0
  const proximo = () => String(++n).padStart(2, '0')

  y = tituloSecao(doc, y, proximo(), 'Partes')
  y = grade(
    doc,
    y,
    [
      ['Contratante', `FUSVE — ${FUSVE_NOME}`],
      ['Contratada', c.fornecedorNome],
      ['CNPJ', FUSVE_CNPJ],
      ['CNPJ', ou(c.fornecedorCnpj)],
      ['Unidade', nomeHospital(c.hospitalId)],
      ['Contato comercial', ou(c.contatoNome)],
      ['Setor responsável', 'Compras'],
      ['E-mail · WhatsApp', [c.contatoEmail, c.contatoWhatsapp].filter(Boolean).join(' · ') || '—'],
    ],
    2,
  )
  y += 5

  y = tituloSecao(doc, y, proximo(), 'Condições comerciais e vigência')
  y = grade(
    doc,
    y,
    [
      ['Objeto', c.titulo || '—'],
      ['Tipo de instrumento', c.tipo],
      ['Status', c.status],
      ['Vigência', `${dataBR(c.vigenciaInicio)} a ${dataBR(c.vigenciaFim)}`],
      ['Situação da vigência', textoVigencia(c.vigenciaFim)],
      ['Decidir a renovação até', m.avisoEm ? `${fmt(m.avisoEm)} (${c.avisoRenovacaoDias} dias antes)` : '—'],
      ['Condição de pagamento', ou(c.condicaoPagamento)],
      ['Reajuste', ou(c.reajusteRegra)],
      ['Desconto por volume', ou(c.gatilhoDesconto)],
      ['Renovação', c.renovacaoAutomatica ? 'Automática' : 'Manual'],
      ['Classificação', ou(c.classificacao)],
      ['Contrato assinado', c.pdfPath ? 'Anexado ao portal' : 'Não anexado ao portal'],
    ],
    3,
  )
  y += 5

  y = tituloSecao(doc, y, proximo(), 'Logística de entrega')
  y = grade(
    doc,
    y,
    [
      ['Frete', ou(c.freteTipo)],
      ['Prazo médio de entrega', ou(c.prazoMedioDias, ' dias')],
      ['Origem do embarque', ou(c.origemEmbarque)],
      ['Tolerância de atraso', ou(c.toleranciaAtrasoDias, ' dias')],
      ['Horário de corte do pedido', ou(c.horarioCutoff)],
      ['', ''],
    ],
    3,
  )
  y += 5

  // Produtos
  y = tituloSecao(doc, y, proximo(), `Produtos contratados (${produtos.length})`, 34)
  if (!produtos.length) {
    texto(doc, 'Nenhum produto cadastrado neste contrato.', M, y + 1, { cor: SUAVE })
    y += 10
  } else {
    const ordenados = [...produtos].sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR', { numeric: true }))
    autoTable(
      doc,
      estiloTabela({
        startY: y,
        head: [['#', 'CÓDIGO', 'DESCRIÇÃO', 'UNIDADE', 'PREÇO UNIT.', 'PED. MÍN.', 'CAPACIDADE']],
        body: ordenados.map((p, i) => [
          String(i + 1),
          p.codSoulmv || '—',
          p.descricao,
          p.unidade || '—',
          p.precoUnitario ? MOEDA.format(p.precoUnitario) : 'sem preço',
          p.moq ? String(p.moq) : '—',
          p.capacidadeFornecimento ? `${p.capacidadeFornecimento}/${p.capacidadePeriodo === 'semana' ? 'sem.' : 'mês'}` : '—',
        ]),
        foot: [['', '', `${produtos.length} ite${produtos.length === 1 ? 'm' : 'ns'}${semPreco ? ` · ${semPreco} sem preço` : ''}`, '', '', '', '']],
        columnStyles: {
          0: { cellWidth: 8, halign: 'right', textColor: SUAVE },
          1: { cellWidth: 18 },
          3: { cellWidth: 18 },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 16, halign: 'right' },
          6: { cellWidth: 20, halign: 'right' },
        },
        didParseCell: (d) => {
          if (d.section === 'head' && [0, 4, 5, 6].includes(d.column.index)) d.cell.styles.halign = 'right'
          if (d.section === 'body' && d.column.index === 4 && d.cell.raw === 'sem preço') {
            d.cell.styles.textColor = AMBAR
            d.cell.styles.fontStyle = 'bold'
          }
        },
      }),
    )
    y = fimTabela(doc) + 10
  }

  // Comodatos — a seção aparece sempre, mesmo vazia, pra gerência saber que não há.
  y = tituloSecao(doc, y, proximo(), `Equipamentos em comodato (${qtdComodato})`, 30)
  if (!comodatos.length) {
    texto(doc, 'Nenhum equipamento em comodato registrado para este contrato.', M, y + 1, { cor: SUAVE })
    y += 10
  } else {
    autoTable(
      doc,
      estiloTabela({
        startY: y,
        head: [['EQUIPAMENTO', 'FABRICANTE / MODELO', 'SÉRIE / PATRIMÔNIO', 'QTD.', 'LOCAL', 'INSTALAÇÃO', 'VALOR EST.']],
        body: comodatos.map((q) => [
          q.equipamento,
          q.fabricanteModelo || '—',
          [q.numeroSerie, q.patrimonio].filter(Boolean).join(' / ') || '—',
          String(q.quantidade),
          q.localInstalacao || '—',
          dataBR(q.dataInstalacao),
          q.valorEstimado ? MOEDA.format(q.valorEstimado * q.quantidade) : '—',
        ]),
        foot: valorComodato
          ? [[{ content: '', colSpan: 3 }, String(qtdComodato), { content: 'Total estimado', colSpan: 2, styles: { halign: 'right' } }, MOEDA.format(valorComodato)]]
          : undefined,
        columnStyles: { 3: { halign: 'right', cellWidth: 11 }, 5: { cellWidth: 22 }, 6: { halign: 'right', cellWidth: 26 } },
        didParseCell: (d) => {
          if ((d.section === 'head' || d.section === 'foot') && [3, 6].includes(d.column.index)) d.cell.styles.halign = 'right'
        },
      }),
    )
    y = fimTabela(doc) + 10
  }

  if (c.observacoes.trim()) {
    y = tituloSecao(doc, y, proximo(), 'Observações', 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.8)
    doc.setTextColor(...TINTA)
    for (const l of doc.splitTextToSize(c.observacoes.trim(), W) as string[]) {
      y = garantir(doc, y, 6)
      doc.text(l, M, y + 1)
      y += 4.3
    }
    y += 6
  }

  // Ciência e aprovação
  y = tituloSecao(doc, y, '', 'Ciência e aprovação', 42)
  const col = (W - 12) / 2
  ;[
    ['Elaborado por', 'Setor de Compras'],
    ['Ciente', 'Coordenação / Gerência'],
  ].forEach(([papel, area], i) => {
    const cx = M + i * (col + 12)
    rotulo(doc, papel, cx, y + 2, { tam: 6.2 })
    texto(doc, area, cx, y + 6.5, { tam: 8.5, cor: SUAVE })
    doc.setDrawColor(...TINTA)
    doc.setLineWidth(0.25)
    doc.line(cx, y + 22, cx + col, y + 22)
    texto(doc, 'Nome e assinatura', cx, y + 26, { tam: 7, cor: SUAVE })
    texto(doc, 'Data: ____/____/________', cx + col, y + 26, { tam: 7, cor: SUAVE, align: 'right' })
  })

  moldura(doc, tipoDoc, nome)
  abrirDocPdf(doc, `${tipoDoc} - ${nome}`)
}

export interface LinhaRelatorioContratos {
  contrato: ContratoHeader
  itens: number | null
  comodatos: number
}

/** Relatório gerencial da carteira de contratos (a lista da tela, com os filtros aplicados). */
export function gerarRelatorioContratosPDF(linhas: LinhaRelatorioContratos[], hospitalId: HospitalId, filtro: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const titulo = 'Carteira de contratos e acordos comerciais'
  let y = cabecalhoDocumento(doc, 'Relatório gerencial', titulo, `${HOSPITAIS[hospitalId].nomeCompleto}${filtro ? ` · ${filtro}` : ''}`, [
    ['Emissão', fmt(getHoje())],
    ['Unidade', HOSPITAIS[hospitalId].sigla],
    ['Contratos listados', String(linhas.length)],
  ])

  const cs = linhas.map((l) => l.contrato)
  const ativos = cs.filter((c) => c.status === 'Ativo')
  const st = (c: ContratoHeader) => statusVigencia(c)
  const aRenovar = ativos.filter((c) => st(c) === 'critico' || st(c) === 'atencao')
  const vencidos = ativos.filter((c) => st(c) === 'vencido')
  const negociacao = cs.filter((c) => c.status === 'Em Negociação').length
  const fornecedores = new Set(cs.map((c) => c.fornecedorNome.trim().toUpperCase())).size
  const comodatos = linhas.reduce((s, l) => s + l.comodatos, 0)

  y += 2
  y = quadroResumo(
    doc,
    y,
    [
      { rotulo: 'Contratos e acordos', valor: String(cs.length), detalhe: `${fornecedores} fornecedor${fornecedores === 1 ? '' : 'es'}` },
      { rotulo: 'Ativos', valor: String(ativos.length), cor: VERDE },
      { rotulo: 'Em negociação', valor: String(negociacao) },
      { rotulo: 'Renovação a decidir', valor: String(aRenovar.length), detalhe: 'na janela de aviso', cor: aRenovar.length ? AMBAR : TINTA },
      { rotulo: 'Ativos vencidos', valor: String(vencidos.length), cor: vencidos.length ? VERMELHO : TINTA },
      { rotulo: 'Equip. em comodato', valor: comodatos ? String(comodatos) : 'Nenhum' },
    ],
    6,
    19,
    14,
  )
  y += 10

  let n = 0
  const proximo = () => String(++n).padStart(2, '0')
  const decidir = [...vencidos, ...aRenovar].sort((a, b) => (a.vigenciaFim ?? '').localeCompare(b.vigenciaFim ?? ''))
  if (decidir.length) {
    y = tituloSecao(doc, y, proximo(), `Renovações a decidir (${decidir.length})`)
    autoTable(
      doc,
      estiloTabela({
        startY: y,
        head: [['CONTRATO / ACORDO', 'FORNECEDOR', 'TÉRMINO', 'SITUAÇÃO', 'DECIDIR ATÉ', 'RENOVAÇÃO']],
        body: decidir.map((c) => {
          const aviso = marcosVigencia(c, getHoje()).avisoEm
          return [c.titulo || '—', c.fornecedorNome, dataBR(c.vigenciaFim), textoVigencia(c.vigenciaFim), aviso ? fmt(aviso) : '—', c.renovacaoAutomatica ? 'Automática' : 'Manual']
        }),
        didParseCell: (d) => {
          if (d.section === 'body' && d.column.index === 3) {
            d.cell.styles.textColor = corVigencia(decidir[d.row.index])
            d.cell.styles.fontStyle = 'bold'
          }
        },
      }),
    )
    y = fimTabela(doc) + 10
  }

  y = tituloSecao(doc, y, proximo(), `Todos os contratos (${cs.length})`)
  const ordem = [...linhas].sort(
    (a, b) => a.contrato.fornecedorNome.localeCompare(b.contrato.fornecedorNome) || a.contrato.titulo.localeCompare(b.contrato.titulo),
  )
  autoTable(
    doc,
    estiloTabela({
      startY: y,
      head: [['CONTRATO / ACORDO', 'FORNECEDOR', 'TIPO', 'STATUS', 'INÍCIO', 'TÉRMINO', 'SITUAÇÃO', 'ENTREGA', 'PAGAMENTO', 'ITENS', 'COMODATO']],
      body: ordem.map(({ contrato: c, itens, comodatos: q }) => [
        c.titulo || '—',
        c.fornecedorNome,
        c.tipo,
        c.status,
        dataBR(c.vigenciaInicio),
        dataBR(c.vigenciaFim),
        textoVigencia(c.vigenciaFim),
        c.prazoMedioDias !== null ? `${c.prazoMedioDias} dias` : '—',
        c.condicaoPagamento || '—',
        itens === null ? '—' : String(itens),
        q ? String(q) : '—',
      ]),
      columnStyles: {
        2: { cellWidth: 26 },
        3: { cellWidth: 24 },
        4: { cellWidth: 19 },
        5: { cellWidth: 19 },
        6: { cellWidth: 30 },
        7: { cellWidth: 16, halign: 'right' },
        9: { cellWidth: 13, halign: 'right' },
        10: { cellWidth: 19, halign: 'right' },
      },
      didParseCell: (d) => {
        if (d.section === 'head' && [7, 9, 10].includes(d.column.index)) d.cell.styles.halign = 'right'
        if (d.section !== 'body') return
        const c = ordem[d.row.index].contrato
        if (d.column.index === 3) {
          d.cell.styles.textColor = corStatus(c.status)
          d.cell.styles.fontStyle = 'bold'
        }
        if (d.column.index === 6) d.cell.styles.textColor = corVigencia(c)
      },
    }),
  )

  moldura(doc, 'Relatório gerencial de contratos', HOSPITAIS[hospitalId].sigla)
  abrirDocPdf(doc, `Carteira de contratos - ${HOSPITAIS[hospitalId].sigla}`)
}
