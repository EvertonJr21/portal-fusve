import produtosJson from './produtos.json'

export interface Produto {
  cod: string
  nome: string
  cat: string
}

/**
 * Base de 17.733 produtos do SoulMV — só usada dentro do módulo Pareceres, carregada sob demanda.
 * Expandida em 15/09/2026 a partir de R_PRODUTO.csv (export completo do SoulMV) além do material
 * médico hospitalar original: medicamentos, laboratório, odontologia, manutenção, limpeza,
 * rouparia/uniformes, segurança do trabalho, produtos químicos, gases, terapia nutricional,
 * informática, acessórios/equipamentos, oncológicos e doados. Categorias fora do fluxo de
 * compras/parecer de marca (patrimônio, energia, decoração, gráficos, obras, refeitório,
 * alimentícios, consignado, papelaria) foram deixadas de fora por decisão do Everton.
 */
export const PRODUTOS_SOULMV: Produto[] = produtosJson as Produto[]
