/**
 * Parser do relatório `R_FORNEC.csv` (cadastro completo de fornecedores do
 * SoulMV) — pedido do Everton (21/09/2026) pra alimentar a escolha de
 * fornecedor em módulos além de OCs (OPME, por exemplo), que hoje só tem os
 * poucos fornecedores cadastrados manualmente em `/ocs/fornecedores`.
 *
 * Não é um CSV linha-por-registro — é um relatório de layout fixo (mesma
 * família dos exports de OC/Solicitação/Acompanhamento) com um bloco de
 * ~7 linhas por fornecedor. Como o número de linhas por bloco varia (7-10,
 * por causa de "Forma de Comunic." ou CNAE com múltiplas linhas em alguns
 * casos), a extração busca por *padrão de conteúdo* — a linha que abre um
 * fornecedor novo (`Fornecedor:` seguido do código) e o primeiro CNPJ
 * (`00.000.000/0000-00`) que aparecer depois dela — em vez de contar um
 * número fixo de linhas por bloco, mesmo princípio de robustez do parser de
 * OC/Solicitação (`csv.ts`) e do de Acompanhamento em planilha (`acompXls.ts`).
 *
 * O relatório trunca a razão social num campo de largura fixa (~34
 * caracteres) — aceito como está, é o que o SoulMV exporta; não tem como
 * recuperar o nome completo sem outra fonte.
 */

export interface FornecedorImportado {
  id: number
  nome: string
  cnpj: string | null
}

const RE_LINHA_ID = /^,,Fornecedor:,,,(\d+),,,(.*?),,Fantasia:/
const RE_CNPJ = /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/

export function parseFornecedoresCSV(texto: string): FornecedorImportado[] {
  const linhas = texto.split(/\r?\n/)
  // Map por id em vez de array — o relatório real tem pelo menos 1 bloco
  // duplicado (mesmo fornecedor repetido, mesmos dados); dedup automático.
  const porId = new Map<number, FornecedorImportado>()
  let atual: FornecedorImportado | null = null

  for (const linha of linhas) {
    const idMatch = linha.match(RE_LINHA_ID)
    if (idMatch) {
      atual = { id: Number(idMatch[1]), nome: idMatch[2].trim().toUpperCase(), cnpj: null }
      porId.set(atual.id, atual)
      continue
    }
    if (atual && !atual.cnpj) {
      const cnpjMatch = linha.match(RE_CNPJ)
      if (cnpjMatch) atual.cnpj = cnpjMatch[1]
    }
  }

  return [...porId.values()].filter((f) => f.nome.length > 0)
}
