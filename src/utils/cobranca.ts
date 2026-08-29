import { PRAZO } from '@/constants'
import type { Fornecedor, OC, Solicitacao } from '@/types'
import { addDias, fmt } from '@/utils/date'
import { dataPrazo, diasRestantes } from '@/utils/oc'

/** Mensagem de cobrança individual de uma OC — mesmo template do app anterior. */
export function gerarMensagemCobranca(oc: OC, sols: Solicitacao[], hospitalNome: string): string {
  const dp = dataPrazo(oc, sols)
  const prazoEntrega = dp ? addDias(dp, PRAZO) : null
  const dr = diasRestantes(dp)

  const linhas = [
    `Olá, ${oc.fornecedorNome}.`,
    '',
    `Gostaríamos de obter uma atualização sobre a OC nº ${oc.id}.`,
  ]

  if (oc.solicitacaoId) {
    const sol = sols.find((s) => s.id === oc.solicitacaoId)
    if (sol) linhas.push(`Referente à Solicitação nº ${sol.id} — ${sol.produto}.`)
  }

  linhas.push('')
  linhas.push(`Situação atual: ${oc.sit}`)
  if (prazoEntrega) linhas.push(`Prazo de entrega: ${fmt(prazoEntrega)}`)
  if (dr !== null) {
    linhas.push(dr < 0 ? `Prazo vencido há ${Math.abs(dr)} dia(s).` : `Faltam ${dr} dia(s) para o prazo.`)
  }
  if (oc.previsaoForn) linhas.push(`Previsão anteriormente confirmada: ${oc.previsaoForn}`)

  linhas.push(
    '',
    'Caso o pedido já tenha sido despachado, pedimos gentileza em nos informar a previsão de chegada.',
    '',
    'Permanecemos à disposição para qualquer esclarecimento.',
    '',
    'Atenciosamente,',
    `Setor de Compras — ${hospitalNome}`,
  )

  return linhas.join('\n')
}

/** Mensagem de cobrança em lote — todas as OCs pendentes de um fornecedor. */
export function gerarMensagemCobrancaLote(fornecedorNome: string, ocs: OC[], sols: Solicitacao[], hospitalNome: string): string {
  const linhas = [`Olá, ${fornecedorNome}.`, '', 'Gostaríamos de obter uma atualização sobre as seguintes OCs em aberto:', '']

  for (const oc of ocs) {
    const dr = diasRestantes(dataPrazo(oc, sols))
    const situacaoPrazo = dr === null ? '' : dr < 0 ? ` (vencida há ${Math.abs(dr)}d)` : ` (${dr}d restantes)`
    linhas.push(`• OC ${oc.id} — ${oc.sit}${situacaoPrazo}`)
  }

  linhas.push(
    '',
    'Pedimos gentileza em nos informar a previsão de entrega de cada uma.',
    '',
    'Atenciosamente,',
    `Setor de Compras — ${hospitalNome}`,
  )

  return linhas.join('\n')
}

export function linkWhatsApp(numero: string, texto: string): string {
  return `https://web.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(texto)}`
}

export function linkOutlookCompose(email: string, assunto: string): string {
  return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(assunto)}`
}

export function fornecedorTemContato(forn: Fornecedor | undefined | null): boolean {
  return !!forn && (!!forn.email || !!forn.wpp)
}
