import type { HospitalId } from '@/constants'
import { supabase } from '@/lib/supabase'
import type { Solicitacao } from '@/types'
import type { Database } from '@/types/database'

/** Acesso ao Supabase pra `sols` — mesmo padrão de `ocRepository.ts` (Hardening P2). */

type SolRow = Database['public']['Tables']['sols']['Row']
type SolUpdate = Database['public']['Tables']['sols']['Update']

export function toSolicitacao(row: SolRow): Solicitacao {
  return {
    id: row.id,
    data: row.data,
    produto: row.produto ?? '',
    motivo: row.motivo ?? '',
    solicitante: row.solicitante ?? '',
    qtd: row.qtd ?? 0,
    sit: row.sit ?? 'Aberta',
    hospitalId: row.hospital_id as HospitalId,
  }
}

export async function listarSols(hospitalId: HospitalId): Promise<Solicitacao[]> {
  const { data, error } = await supabase
    .from('sols')
    .select('*')
    .eq('hospital_id', hospitalId)
    .is('deleted_at', null)
    .order('id', { ascending: false })
  if (error) throw error
  return (data as SolRow[]).map(toSolicitacao)
}

export interface SalvarSolInput {
  id: number
  data: string
  produto: string
  motivo: string
  solicitante: string
  qtd: number
  sit: string
  hospitalId: HospitalId
}

export async function salvarSol(input: SalvarSolInput): Promise<void> {
  const { error } = await supabase.from('sols').upsert({
    id: input.id,
    data: input.data,
    produto: input.produto,
    motivo: input.motivo,
    solicitante: input.solicitante,
    qtd: input.qtd,
    sit: input.sit,
    hospital_id: input.hospitalId,
  })
  if (error) throw error
}

export async function atualizarSituacaoSol(id: number, sit: string): Promise<void> {
  const { error } = await supabase.from('sols').update({ sit }).eq('id', id)
  if (error) throw error
}

const PATCH_FIELD_MAP: Partial<Record<keyof Solicitacao, keyof SolRow>> = {
  data: 'data',
  produto: 'produto',
  motivo: 'motivo',
  solicitante: 'solicitante',
  qtd: 'qtd',
  sit: 'sit',
}

/** Atualização parcial (usada na reconciliação de importação — só preenche campos vazios). */
export async function atualizarCamposSol(id: number, patch: Partial<Solicitacao>): Promise<void> {
  const row: SolUpdate = {}
  for (const [key, value] of Object.entries(patch)) {
    const column = PATCH_FIELD_MAP[key as keyof Solicitacao]
    if (column) (row as Record<string, unknown>)[column] = value
  }
  const { error } = await supabase.from('sols').update(row).eq('id', id)
  if (error) throw error
}

export async function excluirSol(id: number): Promise<void> {
  const { error } = await supabase
    .from('sols')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
