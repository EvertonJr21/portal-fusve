import type { jsPDF } from 'jspdf'

/**
 * Abre um PDF gerado com jsPDF numa aba nova em vez de baixar direto
 * (`doc.save()`) — pedido do Everton pra poder ver o relatório antes de
 * decidir se baixa. `setProperties({ title })` só dá uma sugestão de nome
 * pro "Salvar como" do visualizador do navegador; o próprio blob não tem
 * nome de arquivo (não é um download), por isso não recebe extensão aqui.
 */
export function abrirDocPdf(doc: jsPDF, nomeArquivo: string) {
  doc.setProperties({ title: nomeArquivo })
  const url = URL.createObjectURL(doc.output('blob'))
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Abre um PDF guardado como data URL (base64) numa nova aba. Chrome bloqueia
 * navegação de nível superior (nova aba/janela) direto pra uma `data:` URL —
 * a aba abre em branco/preta, sem erro visível (comportamento anti-phishing
 * desde ~Chrome 84). Convertendo pra Blob e abrindo a `blob:` URL resultante
 * contorna o bloqueio; um `<a href="data:...">` funcionava no app antigo
 * porque a política ainda não existia ou o navegador era outro.
 */
export function abrirPdfDataUrl(dataUrl: string) {
  try {
    const [meta, base64] = dataUrl.split(',')
    const mime = meta.match(/data:(.*);base64/)?.[1] ?? 'application/pdf'
    const binario = atob(base64)
    const bytes = new Uint8Array(binario.length)
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch {
    window.open(dataUrl, '_blank', 'noopener')
  }
}
