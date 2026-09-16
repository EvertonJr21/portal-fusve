import type { HospitalId } from '@/constants'
import { supabase } from '@/lib/supabase'
import type { OC, SituacaoOC } from '@/types'
import type { Database } from '@/types/database'

/**
 * Acesso ao Supabase pra `ocs` — nenhum SQL/mapeamento snake↔camel deve viver
 * em `src/hooks/useOCs.ts`, só chamadas a este arquivo (ver CLAUDE_ENGINEERING.md,
 * seções 15-17: hooks são adaptadores React, não camada de infraestrutura).
 *
 * Primeira entidade migrada pra esse padrão (Hardening P2) — as outras tabelas
 * (sols, forns, contratos, pareceres, opmes...) continuam com Supabase direto
 * dentro do hook por enquanto, migração é gradual (Strangler Pattern), não
 * big-bang.
 */

type OCRow = Database['public']['Tables']['ocs']['Row']
type OCInsert = Database['public']['Tables']['ocs']['Insert']
type OCUpdate = Database['public']['Tables']['ocs']['Update']

export function toOC(row: OCRow): OC {
  return {
    id: row.id,
    dataSolic: row.data_solic,
    fornecedorNome: row.fornecedor_nome ?? '',
    fornecedorId: row.fornecedor_id,
    sit: (row.sit ?? 'Autorizada') as SituacaoOC,
    estoque: row.estoque,
    solicitacaoId: row.solicitacao_id,
    cobrado: row.cobrado ?? false,
    previsaoForn: row.previsao_forn,
    previsaoForn2: row.previsao_forn2,
    dataEntregaReal: row.data_entrega_real,
    diasAtraso: row.dias_atraso ?? 0,
    hospitalId: row.hospital_id as HospitalId,
    proximaAcao: row.proxima_acao,
    motivoAtraso: row.motivo_atraso,
    ultimaMovimentacao: row.ultima_movimentacao,
    previsaoDescumprida: row.previsao_descumprida ?? false,
  }
}

function toRow(oc: Partial<OC> & Pick<OC, 'id' | 'dataSolic' | 'fornecedorNome' | 'hospitalId'>): OCInsert {
  return {
    id: oc.id,
    data_solic: oc.dataSolic,
    fornecedor_nome: oc.fornecedorNome,
    fornecedor_id: oc.fornecedorId ?? null,
    sit: oc.sit ?? 'Autorizada',
    estoque: oc.estoque ?? 'SUP CAF',
    solicitacao_id: oc.solicitacaoId ?? null,
    cobrado: oc.cobrado ?? false,
    previsao_forn: oc.previsaoForn ?? null,
    previsao_forn2: oc.previsaoForn2 ?? null,
    data_entrega_real: oc.dataEntregaReal ?? null,
    dias_atraso: oc.diasAtraso ?? 0,
    hospital_id: oc.hospitalId,
    proxima_acao: oc.proximaAcao ?? null,
    motivo_atraso: oc.motivoAtraso ?? null,
    ultima_movimentacao: oc.ultimaMovimentacao ?? null,
    previsao_descumprida: oc.previsaoDescumprida ?? false,
  }
}

export async function listarOCs(hospitalId: HospitalId): Promise<OC[]> {
  const { data, error } = await supabase
    .from('ocs')
    .select('*')
    .eq('hospital_id', hospitalId)
    .is('deleted_at', null)
    .order('id', { ascending: false })
  if (error) throw error
  return (data as OCRow[]).map(toOC)
}

export interface SalvarOCInput {
  id: number
  dataSolic: string
  fornecedorNome: string
  fornecedorId?: number | null
  sit: SituacaoOC
  estoque?: string | null
  previsaoForn?: string | null
  previsaoForn2?: string | null
  hospitalId: HospitalId
}

export async function salvarOC(input: SalvarOCInput): Promise<void> {
  const { error } = await supabase
    .from('ocs')
    .upsert(toRow({ ...input, fornecedorNome: input.fornecedorNome.trim().toUpperCase() }))
  if (error) throw error
}

export async function atualizarSituacaoOC(id: number, sit: SituacaoOC): Promise<void> {
  const { error } = await supabase.from('ocs').update({ sit }).eq('id', id)
  if (error) throw error
}

const PATCH_FIELD_MAP: Partial<Record<keyof OC, keyof OCRow>> = {
  solicitacaoId: 'solicitacao_id',
  cobrado: 'cobrado',
  previsaoForn: 'previsao_forn',
  previsaoForn2: 'previsao_forn2',
  dataEntregaReal: 'data_entrega_real',
  diasAtraso: 'dias_atraso',
  proximaAcao: 'proxima_acao',
  motivoAtraso: 'motivo_atraso',
  ultimaMovimentacao: 'ultima_movimentacao',
  previsaoDescumprida: 'previsao_descumprida',
  sit: 'sit',
}

/** Atualização parcial de campos operacionais (histórico, vínculo, cobrança) — não é o form de criar/editar. */
export async function atualizarCamposOC(id: number, patch: Partial<OC>): Promise<void> {
  const row: OCUpdate = {}
  for (const [key, value] of Object.entries(patch)) {
    const column = PATCH_FIELD_MAP[key as keyof OC]
    if (column) (row as Record<string, unknown>)[column] = value
  }
  const { error } = await supabase.from('ocs').update(row).eq('id', id)
  if (error) throw error
}

export async function excluirOC(id: number): Promise<void> {
  const { error } = await supabase
    .from('ocs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
