import produtosJson from './produtos.json'

export interface Produto {
  cod: string
  nome: string
  cat: string
}

/** Base de 4.579 produtos do SoulMV — só usada dentro do módulo Pareceres, carregada sob demanda. */
export const PRODUTOS_SOULMV: Produto[] = produtosJson as Produto[]
