import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { Parecer } from '@/types'

function juntar(arr: string[]): string {
  return arr.length ? arr.join(', ') : '—'
}

function validadeTexto(dataISO: string): string {
  if (!dataISO) return '—'
  const dt = new Date(dataISO)
  if (Number.isNaN(dt.getTime())) return dataISO
  const now = new Date()
  const meses = (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth())
  return `${dataISO.split('-').reverse().join('/')} (${meses}m)`
}

/**
 * Gera o relatório em PDF da base de pareceres — porta `gerarRelatorioPDF`
 * de `_legacy/parecer/.../js/pdf-report.js` (jsPDF + autoTable).
 */
export function gerarRelatorioPDF(lista: Parecer[], totalGeral?: number) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const mL = 12
  const mR = 12
  const cW = pageW - mL - mR
  const hoje = new Date().toLocaleDateString('pt-BR')
  const hojeISO = new Date().toISOString().slice(0, 10)

  doc.setFillColor(44, 82, 130)
  doc.rect(0, 0, pageW, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Parecer Técnico FUSVE', mL, 9)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Setor de Compras', mL, 15)
  doc.text(`Emitido em: ${hoje}`, pageW - mR, 9, { align: 'right' })
  const filtroTexto = totalGeral ? `(filtrado — ${lista.length} de ${totalGeral})` : 'Todos os pareceres'
  doc.text(`Relatório de Pareceres Técnicos · ${filtroTexto}`, pageW - mR, 15, { align: 'right' })

  const y = 24
  const boxes = [
    { label: 'Total', val: lista.length, fill: [235, 248, 255], border: [190, 227, 248], text: [44, 82, 130] },
    { label: 'Com Padrão', val: lista.filter((p) => p.padrao.length).length, fill: [240, 255, 244], border: [154, 230, 180], text: [39, 103, 73] },
    { label: 'C/ Proibida', val: lista.filter((p) => p.proibidas.length).length, fill: [255, 245, 245], border: [254, 178, 178], text: [155, 44, 44] },
    { label: 'C/ Restrita', val: lista.filter((p) => p.restritas.length).length, fill: [255, 247, 237], border: [253, 186, 116], text: [123, 52, 30] },
    { label: 'Com PDF', val: lista.filter((p) => p.pdfDataUrl).length, fill: [250, 245, 255], border: [214, 188, 253], text: [85, 60, 154] },
  ] as const

  const bw = (cW - 8) / boxes.length
  boxes.forEach((b, i) => {
    const bx = mL + i * (bw + 2)
    doc.setFillColor(b.fill[0], b.fill[1], b.fill[2])
    doc.setDrawColor(b.border[0], b.border[1], b.border[2])
    doc.roundedRect(bx, y, bw, 14, 1.5, 1.5, 'FD')
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(b.text[0], b.text[1], b.text[2])
    doc.text(String(b.val), bx + bw / 2, y + 7, { align: 'center' })
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(74, 85, 104)
    doc.text(b.label, bx + bw / 2, y + 12, { align: 'center' })
  })

  const legendaY = 42
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(74, 85, 104)
  doc.text('Legenda:', mL, legendaY)
  const legenda = [
    { t: 'P = Padrão', c: [44, 82, 130] as const },
    { t: 'A = Permitida', c: [39, 103, 73] as const },
    { t: 'R = Restrita', c: [123, 52, 30] as const },
    { t: 'X = Proibida', c: [155, 44, 44] as const },
  ]
  let lx = mL + 20
  legenda.forEach((l) => {
    doc.setFillColor(l.c[0], l.c[1], l.c[2])
    doc.circle(lx - 2, legendaY - 1.5, 1.6, 'F')
    doc.setTextColor(l.c[0], l.c[1], l.c[2])
    doc.setFont('helvetica', 'bold')
    doc.text(l.t, lx + 0.5, legendaY)
    lx += 48
  })

  const ordenados = [...lista].sort((a, b) => {
    const ca = (a.cat || '').toUpperCase()
    const cb = (b.cat || '').toUpperCase()
    if (ca !== cb) return ca < cb ? -1 : 1
    return parseInt(a.cod || '0', 10) - parseInt(b.cod || '0', 10)
  })

  const rows = ordenados.map((p, i) => [
    String(i + 1),
    p.cod,
    p.nome || '—',
    p.cat || '—',
    juntar(p.padrao),
    juntar(p.permitidas),
    juntar(p.restritas),
    juntar(p.proibidas),
    (p.observacao || '').substring(0, 55) || '—',
    p.responsavel || '—',
    validadeTexto(p.dataParecer),
  ])

  autoTable(doc, {
    startY: legendaY + 5,
    head: [['#', 'Cód.', 'Produto', 'Categoria', 'P Padrão', 'A Permitidas', 'R Restritas', 'X Proibidas', 'Observações', 'Responsável', 'Validade']],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: { top: 2.2, right: 2.5, bottom: 2.2, left: 2.5 },
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.25,
      textColor: [26, 32, 44],
      font: 'helvetica',
      minCellHeight: 7,
    },
    headStyles: {
      fillColor: [44, 82, 130],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
      1: { cellWidth: 14, halign: 'center', fontStyle: 'bold', textColor: [44, 82, 130] },
      2: { cellWidth: 52 },
      3: { cellWidth: 26 },
      4: { cellWidth: 24, textColor: [44, 82, 130], fontStyle: 'bold' },
      5: { cellWidth: 24, textColor: [39, 103, 73] },
      6: { cellWidth: 20, textColor: [123, 52, 30] },
      7: { cellWidth: 24, textColor: [155, 44, 44], fontStyle: 'bold' },
      8: { cellWidth: 33 },
      9: { cellWidth: 24 },
      10: { cellWidth: 18, halign: 'center', fontSize: 6.2 },
    },
    alternateRowStyles: { fillColor: [247, 250, 252] },
    didParseCell: (d) => {
      if (d.section === 'body' && rows[d.row.index]?.[7] !== '—') d.cell.styles.fillColor = [255, 245, 245]
    },
    didDrawPage: () => {
      const pageInfo = doc.getCurrentPageInfo()
      doc.setFontSize(6.5)
      doc.setTextColor(160, 174, 192)
      doc.setFont('helvetica', 'normal')
      doc.setDrawColor(226, 232, 240)
      doc.line(mL, pageH - 8, pageW - mR, pageH - 8)
      doc.text('Parecer Técnico FUSVE · Setor de Compras', mL, pageH - 4)
      doc.text(`Gerado em ${hoje} · SoulMV`, pageW / 2, pageH - 4, { align: 'center' })
      doc.text(`Pág. ${pageInfo.pageNumber} de {totalPages}`, pageW - mR, pageH - 4, { align: 'right' })
    },
    margin: { top: 0, left: mL, right: mR, bottom: 12 },
    showHead: 'everyPage',
    tableWidth: 'wrap',
  })

  const docWithPutTotal = doc as unknown as { putTotalPages?: (tag: string) => void }
  docWithPutTotal.putTotalPages?.('{totalPages}')
  doc.save(`pareceres-tecnicos-fusve-${hojeISO}${totalGeral ? '-filtrado' : ''}.pdf`)
}
