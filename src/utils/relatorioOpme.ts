import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { HOSPITAIS, type HospitalId } from '@/constants'
import type { Fornecedor, Opme } from '@/types'
import { fmt, parseDMY } from './date'
import { STATUS_OPME_LABEL } from './opme'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/**
 * Relatório mensal de OPME — jsPDF + autoTable, mesmo padrão de
 * `relatorioMensal.ts` (OCs) e `relatorioParecer.ts`. Pedido do Everton
 * (22/09/2026) pra ter o que ele registra no calendário em PDF, pra passar
 * pra coordenadora — carregado sob demanda (`await import`), mesmo padrão
 * de `relatorioParecer.ts`.
 */
export function gerarRelatorioOpmePDF(mes: number, ano: number, hospitalId: HospitalId, opmesDoMes: Opme[], fornecedores: Fornecedor[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const mL = 14
  const mR = 14
  const hoje = new Date().toLocaleDateString('pt-BR')
  const nomeFornecedor = (id: number | null) => fornecedores.find((f) => f.id === id)?.nome ?? '—'

  doc.setFillColor(44, 82, 130)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório Mensal de OPME · FUSVE', mL, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${MESES[mes]} de ${ano} · ${HOSPITAIS[hospitalId].nomeCompleto}`, mL, 16)
  doc.text(`Emitido em ${hoje}`, pageW - mR, 10, { align: 'right' })

  const ordenados = [...opmesDoMes].sort((a, b) => (a.dataCirurgia < b.dataCirurgia ? -1 : a.dataCirurgia > b.dataCirurgia ? 1 : 0))
  const pendentes = ordenados.filter((o) => o.status === 'pendente').length
  const entregues = ordenados.filter((o) => o.status === 'entregue').length

  let y = 30
  doc.setFontSize(11)
  doc.setTextColor(26, 32, 44)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo do Mês', mL, y)
  y += 6

  autoTable(doc, {
    startY: y,
    body: [
      ['Cirurgias com OPME no mês', String(ordenados.length)],
      ['Pendentes', String(pendentes)],
      ['Finalizados', String(entregues)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5, textColor: [26, 32, 44] },
    columnStyles: { 0: { fontStyle: 'normal', cellWidth: 90 }, 1: { fontStyle: 'bold', halign: 'right' } },
    margin: { left: mL, right: mR },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Cirurgias do Mês', mL, y)
  y += 2

  if (ordenados.length === 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Nenhuma cirurgia com OPME registrada neste mês.', mL, y + 6)
  } else {
    autoTable(doc, {
      startY: y + 4,
      head: [['Data', 'Paciente', 'Fornecedor', 'Status', 'Observação']],
      body: ordenados.map((o) => [
        fmt(parseDMY(o.dataCirurgia)),
        o.paciente,
        nomeFornecedor(o.fornecedorId),
        STATUS_OPME_LABEL[o.status],
        o.observacao || '—',
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [26, 32, 44] },
      headStyles: { fillColor: [44, 82, 130], textColor: [255, 255, 255], fontSize: 8 },
      margin: { left: mL, right: mR },
    })
  }

  const totalPaginas = doc.getNumberOfPages()
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(160, 174, 192)
    doc.setFont('helvetica', 'normal')
    doc.line(mL, pageH - 8, pageW - mR, pageH - 8)
    doc.text('Portal FUSVE · Setor de Compras', mL, pageH - 4)
    doc.text(`Pág. ${p} de ${totalPaginas}`, pageW - mR, pageH - 4, { align: 'right' })
  }

  doc.save(`relatorio-opme-${HOSPITAIS[hospitalId].sigla.toLowerCase()}-${ano}-${String(mes + 1).padStart(2, '0')}.pdf`)
}
