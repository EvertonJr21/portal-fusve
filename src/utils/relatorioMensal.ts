import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { Fornecedor, HistOC, OC, Solicitacao } from '@/types'
import { parseDMY } from './date'
import { dataPrazo, isPrevisaoDescumprida, statusPrazo } from './oc'
import { calcularScoresTodos, fornecedoresProblematicos } from './scoreFornecedor'
import { slaFornecedor, slaInterno } from './sla'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function noMes(dataStr: string | null, mes: number, ano: number): boolean {
  const d = parseDMY(dataStr)
  if (!d) return false
  return d.getMonth() === mes && d.getFullYear() === ano
}

/**
 * Relatório gerencial mensal — jsPDF + autoTable, mesmo padrão de
 * `relatorioParecer.ts`. Sem "valor movimentado": OCs não têm preço no
 * schema atual (isso vive em `contrato_produtos`, não em `ocs`).
 */
export function gerarRelatorioMensalPDF(
  mes: number,
  ano: number,
  ocs: OC[],
  sols: Solicitacao[],
  forns: Fornecedor[],
  cobrancas: HistOC[],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const mL = 14
  const mR = 14
  const hoje = new Date().toLocaleDateString('pt-BR')

  doc.setFillColor(44, 82, 130)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório Gerencial de OCs · FUSVE', mL, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${MESES[mes]} de ${ano} · Setor de Compras`, mL, 16)
  doc.text(`Emitido em ${hoje}`, pageW - mR, 10, { align: 'right' })

  const ocsDoMes = ocs.filter((o) => noMes(o.dataSolic, mes, ano))
  const atrasadas = ocsDoMes.filter((o) => statusPrazo(dataPrazo(o, sols), o.sit) === 'vencida')
  const descumpridas = ocsDoMes.filter(isPrevisaoDescumprida)
  const interno = slaInterno(ocsDoMes, sols)
  const fornecedor = slaFornecedor(ocsDoMes, sols)

  let y = 30
  doc.setFontSize(11)
  doc.setTextColor(26, 32, 44)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo do Mês', mL, y)
  y += 6

  const resumo = [
    ['OCs processadas', String(ocsDoMes.length)],
    ['OCs em atraso (institucional)', String(atrasadas.length)],
    ['Previsões descumpridas', String(descumpridas.length)],
    ['SLA interno (Solicitação → OC)', interno.pct !== null ? `${(interno.pct * 100).toFixed(0)}%` : 'sem dado'],
    ['SLA do fornecedor (OC → Entrega)', fornecedor.pct !== null ? `${(fornecedor.pct * 100).toFixed(0)}%` : 'sem dado'],
  ]
  autoTable(doc, {
    startY: y,
    body: resumo,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5, textColor: [26, 32, 44] },
    columnStyles: { 0: { fontStyle: 'normal', cellWidth: 90 }, 1: { fontStyle: 'bold', halign: 'right' } },
    margin: { left: mL, right: mR },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  const scores = calcularScoresTodos(forns, ocs, sols, cobrancas).filter((s) => s.totalOCs >= 3)
  const problematicos = fornecedoresProblematicos(scores).slice(0, 10)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Fornecedores Críticos', mL, y)
  y += 4

  if (problematicos.length === 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Nenhum fornecedor com taxa de atraso significativamente acima da média.', mL, y + 4)
    y += 12
  } else {
    autoTable(doc, {
      startY: y + 2,
      head: [['Fornecedor', 'Score', 'Taxa de Atraso', 'x Média Geral', 'Total OCs']],
      body: problematicos.map((p) => [
        p.fornecedorNome,
        String(p.score),
        p.taxaAtraso !== null ? `${(p.taxaAtraso * 100).toFixed(0)}%` : '—',
        `${p.multiploMedia.toFixed(1)}x`,
        String(p.totalOCs),
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [26, 32, 44] },
      headStyles: { fillColor: [155, 44, 44], textColor: [255, 255, 255], fontSize: 8 },
      margin: { left: mL, right: mR },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  const comMotivo = ocsDoMes.filter((o) => o.motivoAtraso)
  const contagem = new Map<string, number>()
  for (const o of comMotivo) {
    contagem.set(o.motivoAtraso as string, (contagem.get(o.motivoAtraso as string) ?? 0) + 1)
  }
  const ordenado = [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)

  if (y > pageH - 40) {
    doc.addPage()
    y = 20
  }

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 32, 44)
  doc.text('Principais Ocorrências', mL, y)
  y += 4

  if (ordenado.length === 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Nenhuma ocorrência com motivo registrado no período.', mL, y + 4)
  } else {
    autoTable(doc, {
      startY: y + 2,
      head: [['Motivo', 'Ocorrências', '%']],
      body: ordenado.map(([motivo, n]) => [motivo, String(n), `${((n / comMotivo.length) * 100).toFixed(0)}%`]),
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

  doc.save(`relatorio-mensal-ocs-${ano}-${String(mes + 1).padStart(2, '0')}.pdf`)
}
