import type { HospitalId, SituacaoOC } from '@/constants'

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
}

export interface HistOC {
  hid: number
  ocId: number
  ts: number
  canal: 'mail' | 'wpp' | 'mail (lote)' | 'lembrete'
  resposta: string
  tipo: 'individual' | 'lote' | 'lembrete'
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
}

export interface Contrato {
  id: string
  item: string
  codSoulmv: string
  fornecedor: string
  tipo: 'Contrato' | 'Spot'
  precoUnitario: number
  unidade: string
  vigenciaInicio: string | null
  vigenciaFim: string | null
  indiceReajuste: string
  dataProximoReajuste: string | null
  hospitalId: HospitalId | 'ambos'
  classificacao: string
  saldoQtd: number | null
  observacao: string
}
