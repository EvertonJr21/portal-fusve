/** Exportação genérica de uma listagem tabular em PDF (jsPDF + autoTable), dynamic import. */
export async function exportarPDF(nomeArquivo: string, titulo: string, linhas: Record<string, unknown>[]) {
  if (!linhas.length) return
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const mL = 12
  const mR = 12
  const hoje = new Date().toLocaleDateString('pt-BR')

  doc.setFillColor(44, 82, 130)
  doc.rect(0, 0, pageW, 16, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, mL, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Emitido em ${hoje} · ${linhas.length} registro(s)`, pageW - mR, 10, { align: 'right' })

  const colunas = Object.keys(linhas[0])
  const rows = linhas.map((l) => colunas.map((c) => String(l[c] ?? '')))

  autoTable(doc, {
    startY: 22,
    head: [colunas],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', lineColor: [226, 232, 240], lineWidth: 0.25 },
    headStyles: { fillColor: [44, 82, 130], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [247, 250, 252] },
    margin: { top: 22, left: mL, right: mR, bottom: 12 },
    didDrawPage: () => {
      const pageInfo = doc.getCurrentPageInfo()
      doc.setFontSize(6.5)
      doc.setTextColor(160, 174, 192)
      doc.setFont('helvetica', 'normal')
      doc.line(mL, pageH - 8, pageW - mR, pageH - 8)
      doc.text('Portal FUSVE · Setor de Compras', mL, pageH - 4)
      doc.text(`Pág. ${pageInfo.pageNumber} de {totalPages}`, pageW - mR, pageH - 4, { align: 'right' })
    },
    showHead: 'everyPage',
  })

  const docWithPutTotal = doc as unknown as { putTotalPages?: (tag: string) => void }
  docWithPutTotal.putTotalPages?.('{totalPages}')
  doc.save(`${nomeArquivo}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
