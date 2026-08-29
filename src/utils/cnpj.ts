export interface DadosCNPJ {
  razaoSocial: string
  nomeFantasia: string
  municipio: string
  uf: string
}

export function formatarCNPJ(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '').padEnd(14, ' ').slice(0, 14)
  if (d.trim().length < 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

/**
 * Consulta a razão social de um CNPJ na BrasilAPI (serviço público, sem chave,
 * só leitura — dados públicos da Receita Federal).
 */
export async function consultarCNPJ(cnpjBruto: string): Promise<DadosCNPJ> {
  const cnpj = cnpjBruto.replace(/\D/g, '')
  if (cnpj.length !== 14) throw new Error('CNPJ precisa ter 14 dígitos')

  const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
  if (!resp.ok) {
    if (resp.status === 404) throw new Error('CNPJ não encontrado')
    throw new Error(`Erro ao consultar CNPJ (${resp.status})`)
  }
  const data = await resp.json()
  return {
    razaoSocial: data.razao_social ?? '',
    nomeFantasia: data.nome_fantasia ?? '',
    municipio: data.municipio ?? '',
    uf: data.uf ?? '',
  }
}
