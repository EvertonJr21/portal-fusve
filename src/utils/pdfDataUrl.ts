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
