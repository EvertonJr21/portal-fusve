import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { HOSPITAIS, type HospitalId } from '@/constants'
import type { ContratoComodato, ContratoHeader, ContratoProduto } from '@/types'
import { marcosVigencia, pontosDeAtencaoContrato, statusVigencia, textoVigencia } from './contrato'
import { fmt, getHoje } from './date'
import { formatarDias, formatarPct, type DesempenhoFornecedor } from './kpis'
import { abrirDocPdf } from './pdfDataUrl'

/**
 * Relatórios de contratos para impressão (item 110) — pra levar à gerência.
 * Estrutura inspirada nos "contract summary / abstract" dos CLMs: primeiro o
 * que decide (situação, vigência, pontos de atenção), depois os termos
 * (partes, condições comerciais, logística, desempenho), e por fim o detalhe
 * (produtos, comodatos, observações) e o campo de ciência. Carregado sob
 * demanda (`await import`), igual aos outros relatórios.
 */

type RGB = [number, number, number]
const AZUL: RGB = [26, 74, 128]
const TINTA: RGB = [26, 32, 44]
const CINZA: RGB = [100, 116, 139]
const LINHA: RGB = [226, 232, 240]
const FUNDO: RGB = [246, 248, 251]
const VERDE: RGB = [21, 128, 61]
const AMBAR: RGB = [180, 83, 9]
const VERMELHO: RGB = [185, 28, 28]

const FUSVE = 'FUSVE — Fundação Educacional Severino Sombra'
const FUSVE_CNPJ = '32.410.037/0001-84'
const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const ML = 14
const MR = 14

const dataBR = (iso: string | null) => {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}
const ou = (v: string | number | null | undefined, sufixo = '') => (v === null || v === undefined || v === '' ? '—' : `${v}${sufixo}`)
const nomeHospital = (h: HospitalId | 'ambos') => (h === 'ambos' ? 'HUV e HMK' : HOSPITAIS[h].nomeCompleto)

function corVigencia(c: ContratoHeader): RGB {
  const s = statusVigencia(c)
  return s === 'vencido' || s === 'critico' ? VERMELHO : s === 'atencao' ? AMBAR : s === 'ok' ? VERDE : CINZA
}

function corStatus(status: string): RGB {
  return status === 'Ativo' ? VERDE : status === 'Em Negociação' ? AMBAR : status === 'Suspenso' ? VERMELHO : CINZA
}

/** Rodapé em todas as páginas + número de página (desenhado no fim, quando já se sabe o total). */
function rodape(doc: jsPDF, texto: string) {
  const total = doc.getNumberOfPages()
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINHA)
    doc.line(ML, h - 12, w - MR, h - 12)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...CINZA)
    doc.text(texto, ML, h - 7)
    doc.text(`Página ${i} de ${total}`, w - MR, h - 7, { align: 'right' })
  }
}

function cabecalho(doc: jsPDF, rotulo: string, titulo: string, subtitulo: string) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, w, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text(rotulo.toUpperCase(), ML, 9)
  doc.setFontSize(15)
  const linhasTitulo = doc.splitTextToSize(titulo, w - ML - MR - 60) as string[]
  doc.text(linhasTitulo[0], ML, 17)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(doc.splitTextToSize(subtitulo, w - ML - MR - 60)[0] as string, ML, 24)
  doc.setFontSize(8)
  doc.text('FUSVE · Setor de Compras', w - MR, 9, { align: 'right' })
  doc.text(`Emitido em ${fmt(getHoje())}`, w - MR, 14, { align: 'right' })
}

/** Título de seção numerada; quebra a página se faltar espaço. Devolve o y logo abaixo. */
function secao(doc: jsPDF, y: number, titulo: string, espacoMin = 30): number {
  const h = doc.internal.pageSize.getHeight()
  if (y + espacoMin > h - 18) {
    doc.addPage()
    y = 18
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...AZUL)
  doc.text(titulo, ML, y)
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.4)
  doc.line(ML, y + 1.6, ML + 14, y + 1.6)
  doc.setLineWidth(0.2)
  return y + 5
}

function chip(doc: jsPDF, x: number, y: number, texto: string, cor: RGB): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  const tw = doc.getTextWidth(texto) + 5
  doc.setFillColor(...cor)
  doc.roundedRect(x, y - 3.6, tw, 5.2, 1.3, 1.3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(texto, x + 2.5, y)
  return x + tw + 2
}

/** Tabela chave → valor em duas colunas (padrão "ficha"). */
function ficha(doc: jsPDF, y: number, linhas: [string, string][], x = ML, largura?: number): number {
  const w = doc.internal.pageSize.getWidth()
  autoTable(doc, {
    startY: y,
    margin: { left: x, right: largura ? w - x - largura : MR },
    tableWidth: largura ?? 'auto',
    body: linhas,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: { top: 1.3, bottom: 1.3, left: 2, right: 2 }, textColor: TINTA, lineColor: LINHA, lineWidth: { bottom: 0.15 } },
    columnStyles: { 0: { cellWidth: 42, textColor: CINZA, fontStyle: 'bold', fontSize: 7.5 } },
  })
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

const fimTabela = (doc: jsPDF) => (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

export interface DadosResumoContrato {
  contrato: ContratoHeader
  produtos: ContratoProduto[]
  comodatos: ContratoComodato[]
  desempenho: DesempenhoFornecedor | null
}

/** Resumo completo de um contrato/acordo, pronto para imprimir ou salvar em PDF. */
export function gerarResumoContratoPDF({ contrato: c, produtos, comodatos, desempenho }: DadosResumoContrato) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const conteudo = W - ML - MR
  const nome = c.titulo || c.fornecedorNome

  cabecalho(doc, `Resumo de ${c.tipo === 'Acordo Comercial' ? 'acordo comercial' : 'contrato'}`, nome, c.titulo ? c.fornecedorNome : c.tipo)

  // Situação em chips
  let y = 38
  let x = chip(doc, ML, y, c.status.toUpperCase(), corStatus(c.status))
  x = chip(doc, x, y, textoVigencia(c.vigenciaFim).toUpperCase(), corVigencia(c))
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...CINZA)
  doc.text([c.tipo, nomeHospital(c.hospitalId), c.classificacao].filter(Boolean).join('  ·  '), x + 1, y)

  // Números-chave
  y += 6
  const semPreco = produtos.filter((p) => !p.precoUnitario).length
  const cards: [string, string, string][] = [
    ['VIGÊNCIA ATÉ', dataBR(c.vigenciaFim), `desde ${dataBR(c.vigenciaInicio)}`],
    ['PRAZO DE ENTREGA', c.prazoMedioDias !== null ? `${c.prazoMedioDias} dias` : '—', [c.freteTipo && `Frete ${c.freteTipo}`, c.origemEmbarque].filter(Boolean).join(' · ') || ' '],
    ['PAGAMENTO', c.condicaoPagamento || '—', c.reajusteRegra ? `Reajuste: ${c.reajusteRegra}` : ' '],
    ['ITENS CONTRATADOS', String(produtos.length), semPreco ? `${semPreco} sem preço` : produtos.length ? 'todos com preço' : ' '],
  ]
  const gap = 3
  const cw = (conteudo - gap * 3) / 4
  cards.forEach(([rot, val, det], i) => {
    const cx = ML + i * (cw + gap)
    doc.setFillColor(...FUNDO)
    doc.setDrawColor(...LINHA)
    doc.roundedRect(cx, y, cw, 20, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...CINZA)
    doc.text(rot, cx + 3, y + 5)
    doc.setFontSize(10)
    doc.setTextColor(...TINTA)
    doc.text(doc.splitTextToSize(val, cw - 6)[0] as string, cx + 3, y + 11.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...CINZA)
    doc.text(doc.splitTextToSize(det, cw - 6)[0] as string, cx + 3, y + 16.5)
  })
  y += 25

  // Barra da vigência
  const m = marcosVigencia(c, getHoje())
  if (m.pctDecorrido !== null) {
    doc.setFillColor(...LINHA)
    doc.roundedRect(ML, y, conteudo, 2.4, 1.2, 1.2, 'F')
    doc.setFillColor(...corVigencia(c))
    if (m.pctDecorrido > 0) doc.roundedRect(ML, y, Math.max(2.4, (conteudo * m.pctDecorrido) / 100), 2.4, 1.2, 1.2, 'F')
    doc.setFontSize(7)
    doc.setTextColor(...CINZA)
    doc.text(`${m.pctDecorrido}% da vigência decorrida (${m.duracaoDias} dias no total)`, ML, y + 6.5)
    if (m.avisoEm) doc.text(`Decidir a renovação até ${fmt(m.avisoEm)} (${c.avisoRenovacaoDias} dias antes do fim)`, W - MR, y + 6.5, { align: 'right' })
    y += 15
  } else y += 4

  // Pontos de atenção
  const pontos = pontosDeAtencaoContrato(c, { produtos, classe: desempenho?.classe?.classe ?? null, temPdfAssinado: !!c.pdfPath })
  y = secao(doc, y, 'Pontos de atenção', 16)
  if (!pontos.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...VERDE)
    doc.text('Nenhum ponto de atenção: vigência em dia, preços e cadastro completos.', ML, y + 2)
    y += 7
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      body: pontos.map((p) => [p.nivel === 'alto' ? 'ALTA' : 'MÉDIA', p.texto]),
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 1.4, textColor: TINTA },
      columnStyles: { 0: { cellWidth: 14, fontStyle: 'bold', fontSize: 7 } },
      didParseCell: (d) => {
        if (d.column.index === 0) d.cell.styles.textColor = d.cell.raw === 'ALTA' ? VERMELHO : AMBAR
      },
    })
    y = fimTabela(doc) + 4
  }

  // 1. Partes
  y = secao(doc, y + 4, '1. Partes', 40)
  const meia = (conteudo - 6) / 2
  const fimA = ficha(
    doc,
    y,
    [
      ['Contratante', FUSVE],
      ['CNPJ', FUSVE_CNPJ],
      ['Unidade', nomeHospital(c.hospitalId)],
      ['Setor responsável', 'Compras'],
    ],
    ML,
    meia,
  )
  const fimB = ficha(
    doc,
    y,
    [
      ['Fornecedor', c.fornecedorNome],
      ['CNPJ', ou(c.fornecedorCnpj)],
      ['Contato', ou(c.contatoNome)],
      ['E-mail / WhatsApp', [c.contatoEmail, c.contatoWhatsapp].filter(Boolean).join(' · ') || '—'],
    ],
    ML + meia + 6,
    meia,
  )
  y = Math.max(fimA, fimB) + 9

  // 2. Vigência e condições comerciais
  y = secao(doc, y, '2. Vigência e condições comerciais', 40)
  y =
    ficha(doc, y, [
      ['Objeto', c.titulo || '—'],
      ['Tipo', c.tipo],
      ['Vigência', `${dataBR(c.vigenciaInicio)} a ${dataBR(c.vigenciaFim)} — ${textoVigencia(c.vigenciaFim).toLowerCase()}`],
      ['Renovação', `${c.renovacaoAutomatica ? 'Automática' : 'Manual'} · aviso ${c.avisoRenovacaoDias} dias antes${m.avisoEm ? ` (${fmt(m.avisoEm)})` : ''}`],
      ['Condição de pagamento', ou(c.condicaoPagamento)],
      ['Reajuste', ou(c.reajusteRegra)],
      ['Desconto por volume', ou(c.gatilhoDesconto)],
      ['Contrato assinado', c.pdfPath ? `Anexado ao portal${c.pdfNome ? ` (${c.pdfNome})` : ''}` : 'Não anexado ao portal'],
    ]) + 9

  // 3. Logística
  y = secao(doc, y, '3. Logística de entrega', 30)
  y =
    ficha(doc, y, [
      ['Frete', ou(c.freteTipo)],
      ['Prazo médio de entrega', ou(c.prazoMedioDias, ' dias')],
      ['Origem do embarque', ou(c.origemEmbarque)],
      ['Tolerância de atraso', ou(c.toleranciaAtrasoDias, ' dias')],
      ['Horário de corte (cut-off)', ou(c.horarioCutoff)],
    ]) + 9

  // 4. Desempenho de entrega
  y = secao(doc, y, '4. Desempenho de entrega do fornecedor', 30)
  if (!desempenho || desempenho.resumo.avaliadas === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...CINZA)
    doc.text('Sem ordens de compra avaliadas para este fornecedor no portal.', ML, y + 2)
    y += 8
  } else {
    const r = desempenho.resumo
    const nota = desempenho.classe ? `${desempenho.classe.classe} — ${desempenho.classe.acao}` : `Sem nota (menos de 5 OCs avaliadas)`
    y =
      ficha(doc, y, [
        ['Nota de entrega', nota],
        ['OTIF (no prazo e completa)', formatarPct(r.otif)],
        ['Entregas no prazo', `${formatarPct(r.onTime)} (${r.noPrazo} de ${r.avaliadas})`],
        ['Entregas completas', formatarPct(r.inFull)],
        ['Tempo de entrega', `mediana ${formatarDias(r.leadTimeMediana)} · 90% em até ${formatarDias(r.leadTimeP90)}`],
        ['OCs consideradas', `${r.avaliadas} avaliadas · ${r.abertasVencidas} em aberto além do prazo`],
      ]) + 2
    doc.setFontSize(6.8)
    doc.setTextColor(...CINZA)
    doc.text('Todas as OCs do fornecedor no portal, não só as deste contrato. Prazo = data da OC + prazo médio do contrato.', ML, y + 2)
    y += 10
  }

  // 5. Produtos
  y = secao(doc, y, `5. Produtos contratados (${produtos.length})`, 30)
  if (!produtos.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...CINZA)
    doc.text('Nenhum produto cadastrado neste contrato.', ML, y + 2)
    y += 8
  } else {
    const ordenados = [...produtos].sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR', { numeric: true }))
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR, bottom: 16 },
      head: [['#', 'Cód. SoulMV', 'Descrição', 'Unid.', 'Preço unit.', 'Ped. mín.', 'Capacidade']],
      body: ordenados.map((p, i) => [
        String(i + 1),
        p.codSoulmv || '—',
        p.descricao,
        p.unidade || '—',
        p.precoUnitario ? MOEDA.format(p.precoUnitario) : 'sem preço',
        p.moq ? String(p.moq) : '—',
        p.capacidadeFornecimento ? `${p.capacidadeFornecimento}/${p.capacidadePeriodo === 'semana' ? 'sem.' : 'mês'}` : '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: AZUL, fontSize: 7.5, textColor: [255, 255, 255] },
      styles: { fontSize: 7.5, cellPadding: 1.4, textColor: TINTA },
      alternateRowStyles: { fillColor: FUNDO },
      columnStyles: {
        0: { cellWidth: 8, halign: 'right', textColor: CINZA },
        1: { cellWidth: 20 },
        3: { cellWidth: 16 },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 16, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
      },
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 4 && d.cell.raw === 'sem preço') d.cell.styles.textColor = AMBAR
      },
    })
    y = fimTabela(doc) + 9
  }

  // 6. Comodatos
  if (comodatos.length) {
    const total = comodatos.reduce((s, x) => s + (x.valorEstimado ?? 0) * x.quantidade, 0)
    y = secao(doc, y, `6. Equipamentos em comodato (${comodatos.reduce((s, x) => s + x.quantidade, 0)})`, 30)
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR, bottom: 16 },
      head: [['Equipamento', 'Fabricante / modelo', 'Série / patrimônio', 'Qtd.', 'Local', 'Instalação', 'Valor est.']],
      body: comodatos.map((x) => [
        x.equipamento,
        x.fabricanteModelo || '—',
        [x.numeroSerie, x.patrimonio].filter(Boolean).join(' / ') || '—',
        String(x.quantidade),
        x.localInstalacao || '—',
        dataBR(x.dataInstalacao),
        x.valorEstimado ? MOEDA.format(x.valorEstimado * x.quantidade) : '—',
      ]),
      foot: total ? [['', '', '', '', '', 'Total estimado', MOEDA.format(total)]] : undefined,
      theme: 'striped',
      headStyles: { fillColor: AZUL, fontSize: 7.5, textColor: [255, 255, 255] },
      footStyles: { fillColor: FUNDO, textColor: TINTA, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 1.4, textColor: TINTA },
      alternateRowStyles: { fillColor: FUNDO },
      columnStyles: { 3: { halign: 'right', cellWidth: 10 }, 6: { halign: 'right', cellWidth: 24 } },
    })
    y = fimTabela(doc) + 9
  }

  // 7. Observações
  if (c.observacoes.trim()) {
    y = secao(doc, y, `${comodatos.length ? '7' : '6'}. Observações`, 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...TINTA)
    const linhas = doc.splitTextToSize(c.observacoes.trim(), conteudo) as string[]
    for (const l of linhas) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage()
        y = 18
      }
      doc.text(l, ML, y + 2)
      y += 4.2
    }
    y += 4
  }

  // Ciência
  y = secao(doc, y + 2, 'Ciência', 34)
  const col = (conteudo - 10) / 2
  ;['Elaborado por — Setor de Compras', 'Ciente — Coordenação / Gerência'].forEach((rot, i) => {
    const cx = ML + i * (col + 10)
    doc.setDrawColor(...CINZA)
    doc.line(cx, y + 14, cx + col, y + 14)
    doc.setFontSize(7.5)
    doc.setTextColor(...CINZA)
    doc.text(rot, cx, y + 18.5)
    doc.text('Data: ____/____/________', cx, y + 23.5)
  })

  rodape(doc, `Portal FUSVE · Resumo de contrato — ${nome}`)
  abrirDocPdf(doc, `Resumo de contrato - ${nome}`)
}

export interface LinhaRelatorioContratos {
  contrato: ContratoHeader
  itens: number | null
  comodatos: number
  desempenho: DesempenhoFornecedor | null
}

/** Visão geral de todos os contratos (a lista que está na tela), para a gerência. */
export function gerarRelatorioContratosPDF(linhas: LinhaRelatorioContratos[], hospitalId: HospitalId, filtro: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const conteudo = W - ML - MR
  cabecalho(doc, 'Relatório de contratos e acordos comerciais', 'Contratos e acordos comerciais', `${HOSPITAIS[hospitalId].nomeCompleto}${filtro ? ` · ${filtro}` : ''}`)

  const cs = linhas.map((l) => l.contrato)
  const ativos = cs.filter((c) => c.status === 'Ativo')
  const st = (c: ContratoHeader) => statusVigencia(c)
  const vencendo = ativos.filter((c) => st(c) === 'critico' || st(c) === 'atencao')
  const vencidos = ativos.filter((c) => st(c) === 'vencido')
  const fornecedores = new Set(cs.map((c) => c.fornecedorNome.trim().toUpperCase())).size

  let y = 37
  const cards: [string, string, RGB][] = [
    ['CONTRATOS / ACORDOS', String(cs.length), TINTA],
    ['ATIVOS', String(ativos.length), VERDE],
    ['A RENOVAR (JANELA DE AVISO)', String(vencendo.length), vencendo.length ? AMBAR : TINTA],
    ['ATIVOS COM VIGÊNCIA VENCIDA', String(vencidos.length), vencidos.length ? VERMELHO : TINTA],
    ['FORNECEDORES', String(fornecedores), TINTA],
  ]
  const gap = 3
  const cw = (conteudo - gap * (cards.length - 1)) / cards.length
  cards.forEach(([rot, val, cor], i) => {
    const cx = ML + i * (cw + gap)
    doc.setFillColor(...FUNDO)
    doc.setDrawColor(...LINHA)
    doc.roundedRect(cx, y, cw, 16, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...CINZA)
    doc.text(rot, cx + 3, y + 5)
    doc.setFontSize(14)
    doc.setTextColor(...cor)
    doc.text(val, cx + 3, y + 12.5)
  })
  y += 22

  // Próximas decisões
  const decidir = [...vencidos, ...vencendo].sort((a, b) => (a.vigenciaFim ?? '').localeCompare(b.vigenciaFim ?? ''))
  if (decidir.length) {
    y = secao(doc, y, 'Decisões de renovação pendentes', 20)
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [['Contrato / fornecedor', 'Fim da vigência', 'Situação', 'Renovação']],
      body: decidir.map((c) => [
        c.titulo ? `${c.titulo} — ${c.fornecedorNome}` : c.fornecedorNome,
        dataBR(c.vigenciaFim),
        textoVigencia(c.vigenciaFim),
        c.renovacaoAutomatica ? 'Automática' : 'Manual',
      ]),
      theme: 'striped',
      headStyles: { fillColor: AZUL, fontSize: 7.5, textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 1.4, textColor: TINTA },
      alternateRowStyles: { fillColor: FUNDO },
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 2) d.cell.styles.textColor = String(d.cell.raw).startsWith('Vencido') ? VERMELHO : AMBAR
      },
    })
    y = fimTabela(doc) + 7
  }

  y = secao(doc, y, `Todos os contratos (${cs.length})`, 20)
  const ordem = [...linhas].sort(
    (a, b) => a.contrato.fornecedorNome.localeCompare(b.contrato.fornecedorNome) || a.contrato.titulo.localeCompare(b.contrato.titulo),
  )
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR, bottom: 16 },
    head: [['Contrato / acordo', 'Fornecedor', 'Tipo', 'Status', 'Vigência', 'Situação', 'Prazo', 'Pagamento', 'Itens', 'Comod.', 'Nota']],
    body: ordem.map(({ contrato: c, itens, comodatos, desempenho }) => [
      c.titulo || '—',
      c.fornecedorNome,
      c.tipo,
      c.status,
      `${dataBR(c.vigenciaInicio)} a ${dataBR(c.vigenciaFim)}`,
      textoVigencia(c.vigenciaFim),
      c.prazoMedioDias !== null ? `${c.prazoMedioDias}d` : '—',
      c.condicaoPagamento || '—',
      itens === null ? '—' : String(itens),
      comodatos ? String(comodatos) : '—',
      desempenho?.classe ? `${desempenho.classe.classe} · ${formatarPct(desempenho.resumo.otif)}` : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: AZUL, fontSize: 7.5, textColor: [255, 255, 255] },
    styles: { fontSize: 7.5, cellPadding: 1.4, textColor: TINTA, overflow: 'linebreak' },
    alternateRowStyles: { fillColor: FUNDO },
    columnStyles: {
      2: { cellWidth: 22 },
      3: { cellWidth: 20 },
      4: { cellWidth: 36 },
      5: { cellWidth: 28 },
      6: { cellWidth: 13, halign: 'right' },
      8: { cellWidth: 11, halign: 'right' },
      9: { cellWidth: 13, halign: 'right' },
      10: { cellWidth: 18 },
    },
    didParseCell: (d) => {
      if (d.section !== 'body') return
      const c = ordem[d.row.index].contrato
      if (d.column.index === 3) d.cell.styles.textColor = corStatus(c.status)
      if (d.column.index === 5) d.cell.styles.textColor = corVigencia(c)
    },
  })

  doc.setFontSize(6.8)
  doc.setTextColor(...CINZA)
  const yNota = fimTabela(doc) + 5
  if (yNota < doc.internal.pageSize.getHeight() - 16)
    doc.text('Nota = desempenho de entrega do fornecedor (OTIF: A a partir de 90%, B de 75%, C de 60%, D abaixo disso), com 5 ou mais OCs avaliadas.', ML, yNota)

  rodape(doc, `Portal FUSVE · Relatório de contratos — ${HOSPITAIS[hospitalId].sigla}`)
  abrirDocPdf(doc, `Contratos - ${HOSPITAIS[hospitalId].sigla}`)
}
