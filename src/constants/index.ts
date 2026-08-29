export const HOSPITAIS = {
  huv: {
    id: 'huv',
    nome: 'HUV',
    nomeCompleto: 'Hospital Universitário de Vassouras — HUV',
    sigla: 'HUV',
    cor: '#1A4A80',
  },
  mkr: {
    id: 'mkr',
    nome: 'HMK',
    nomeCompleto: 'Hospital Mario Kroeff — HMK',
    sigla: 'HMK',
    cor: '#196030',
  },
} as const

export type HospitalId = keyof typeof HOSPITAIS

/** Prazo institucional, em dias, a partir da data da solicitação (não da OC). */
export const PRAZO = 15

export const FINAL_SIT = ['Atendida', 'Cancelada', 'Fechada'] as const

/**
 * Hierarquia de situações de OC — parsers de importação nunca retrocedem
 * a situação de uma OC existente com base nesse ranking.
 */
export const SIT_RANK: Record<string, number> = {
  Aberta: 0,
  Autorizada: 1,
  'Parcialmente Atendida': 2,
  Atendida: 3,
  Cancelada: 3,
  Fechada: 3,
}

export const SITUACOES_OC = [
  'Autorizada',
  'Parcialmente Atendida',
  'Atendida',
  'Aberta',
  'Cancelada',
  'Fechada',
] as const
export type SituacaoOC = (typeof SITUACOES_OC)[number]

export const TIPOS_CONTRATO = ['Contrato', 'Acordo Comercial'] as const
export type TipoContrato = (typeof TIPOS_CONTRATO)[number]

export const STATUS_CONTRATO = ['Ativo', 'Inativo', 'Em Negociação', 'Suspenso'] as const
export type StatusContrato = (typeof STATUS_CONTRATO)[number]

export const FRETE_TIPOS = ['CIF', 'FOB'] as const
export type FreteTipo = (typeof FRETE_TIPOS)[number]

export const CAPACIDADE_PERIODOS = ['semana', 'mes'] as const
export type CapacidadePeriodo = (typeof CAPACIDADE_PERIODOS)[number]

export const AVISO_RENOVACAO_OPCOES = [30, 60, 90] as const

export const CLASSIFICACOES_CONTRATO = [
  'OPME',
  'CME',
  'Farmácia',
  'Infraestrutura',
  'Equipamentos',
  'Material Hospitalar',
  'Laboratório',
  'Radiologia',
  'Outros',
] as const

/** Alertas de vencimento de contrato, em dias restantes até `vigencia_fim`. */
export const ALERTA_VENCIMENTO_DIAS = 90
export const ALERTA_CRITICO_DIAS = 30
