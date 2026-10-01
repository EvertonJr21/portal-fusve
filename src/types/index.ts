import type { CapacidadePeriodo, FreteTipo, HospitalId, SituacaoOC, StatusContrato, StatusOpme, TipoContrato } from '@/constants'

export type { SituacaoOC } from '@/constants'

/**
 * Tipos de domínio, em camelCase, derivados das tabelas do Supabase
 * (ver `src/types/database.ts`, gerado por `supabase gen types`).
 * Hoje definidos manualmente enquanto o CLI do Supabase não é gerado —
 * devem ser conferidos contra `database.ts` assim que ele existir.
 */

export interface OC {
  id: number
  dataSolic: string | null
  fornecedorNome: string
  fornecedorId: number | null
  sit: SituacaoOC
  estoque: string | null
  solicitacaoId: number | null
  cobrado: boolean
  previsaoForn: string | null
  previsaoForn2: string | null
  dataEntregaReal: string | null
  /** Data em que a OC entrou pela primeira vez em "Parcialmente Atendida" — nunca sobrescrita depois. */
  dataParcial: string | null
  diasAtraso: number
  hospitalId: HospitalId
  proximaAcao: string | null
  motivoAtraso: string | null
  ultimaMovimentacao: string | null
  previsaoDescumprida: boolean
}

export interface Solicitacao {
  id: number
  data: string | null
  produto: string
  motivo: string
  solicitante: string
  qtd: number
  sit: string
  hospitalId: HospitalId
}

export interface Fornecedor {
  id: number
  nome: string
  email: string
  wpp: string
  /** CNPJ oficial (`00.000.000/0000-00`) — vem do cadastro do SoulMV, não do formulário manual. `undefined` = não coletado ainda. */
  cnpj?: string | null
}

export interface HistOC {
  hid: number
  ocId: number
  ts: number
  canal: 'mail' | 'wpp' | 'mail (lote)' | 'lembrete'
  resposta: string
  tipo: 'individual' | 'lote' | 'lembrete'
  respondidoEm: number | null
}

export type MarcaCategoria = 'padrao' | 'permitidas' | 'restritas' | 'proibidas'

export interface Parecer {
  cod: string
  nome: string
  cat: string
  padrao: string[]
  permitidas: string[]
  restritas: string[]
  proibidas: string[]
  observacao: string
  responsavel: string
  dataParecer: string
  parecer: string
  pdfDataUrl: string | null
  pdfPath: string | null
}

/** PDF vinculado a uma marca específica de um parecer — um parecer pode ter vários (um por marca). */
export interface ParecerAnexo {
  id: string
  parecerCod: string
  categoria: MarcaCategoria
  marca: string
  pdfPath: string
  nomeArquivo: string
  createdAt: string
}

export interface Opme {
  id: string
  paciente: string
  dataCirurgia: string
  fornecedorId: number | null
  hospitalId: HospitalId
  status: StatusOpme
  observacao: string
}

export interface ContratoHeader {
  id: string
  tipo: TipoContrato
  status: StatusContrato
  fornecedorNome: string
  fornecedorCnpj: string
  contatoNome: string
  contatoEmail: string
  contatoWhatsapp: string
  freteTipo: FreteTipo | ''
  prazoMedioDias: number | null
  origemEmbarque: string
  toleranciaAtrasoDias: number | null
  horarioCutoff: string
  gatilhoDesconto: string
  reajusteRegra: string
  vigenciaInicio: string | null
  vigenciaFim: string | null
  avisoRenovacaoDias: number
  renovacaoAutomatica: boolean
  hospitalId: HospitalId | 'ambos'
  classificacao: string
  observacoes: string
}

export interface ContratoProduto {
  id: string
  contratoId: string
  sku: string
  descricao: string
  codSoulmv: string
  precoUnitario: number
  unidade: string
  moq: number | null
  capacidadeFornecimento: number | null
  capacidadePeriodo: CapacidadePeriodo
  meioPagamento: string
}

/** Setor do hospital (Centro Cirúrgico, UTI, etc.) — por hospital, editável em /catalogo/gestao. */
export interface Area {
  id: string
  hospitalId: HospitalId
  nome: string
  ordem: number
  ativo: boolean
}

/**
 * Categoria/tag livre de um item do catálogo (ex: "Agulhas", "OPME — Ortopédica")
 * — não pertence a uma área fixa, um item pode estar em vários grupos ou em nenhum
 * (uso geral). Compartilhado entre os dois hospitais.
 */
export interface Grupo {
  id: string
  nome: string
  ordem: number
  /** Descrição genérica de uso típico desse grupo de material — pesquisa geral, não validada clinicamente (ver item 55 do backlog). */
  descricaoUso: string
}

/** Item do Catálogo de Materiais por Área Hospitalar — compartilhado entre HUV/HMK. */
export interface ItemCatalogo {
  id: string
  nome: string
  unidadePadrao: string
  codSoulmv: string | null
  sinonimos: string[]
  observacao: string
  /** Resumo de como o item é usado — sobrescreve `Grupo.descricaoUso` quando preenchido. */
  resumoUso: string
}

/** Vínculo item↔área — N:N, `principal` marca a área de uso mais típico quando fizer sentido. */
export interface ItemArea {
  itemId: string
  areaId: string
  principal: boolean
}
