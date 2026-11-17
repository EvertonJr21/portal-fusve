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

/**
 * Abre um PDF gerado de forma assíncrona (item 112). A janela é aberta já no
 * clique — depois de um `await` o navegador trataria como pop-up e bloquearia
 * — com um aviso "Gerando…", e recebe o PDF quando ele fica pronto. Se o
 * navegador bloquear mesmo assim, baixa o arquivo.
 */
export async function abrirPdfGerado(gerar: () => Promise<Blob>, nomeArquivo: string) {
  const janela = window.open('', '_blank')
  if (janela) {
    janela.document.title = nomeArquivo
    janela.document.body.style.cssText = 'font-family:system-ui,sans-serif;color:#555;display:grid;place-items:center;height:100vh;margin:0'
    janela.document.body.textContent = 'Gerando o relatório…'
  }
  try {
    const blob = await gerar()
    const url = URL.createObjectURL(blob)
    if (janela && !janela.closed) {
      janela.location.href = url
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = `${nomeArquivo}.pdf`
      a.click()
    }
    setTimeout(() => URL.revokeObjectURL(url), 120_000)
  } catch (err) {
    janela?.close()
    throw err
  }
}
