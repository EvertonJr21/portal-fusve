import type { HospitalId, StatusOpme } from '@/constants'
import { supabase } from '@/lib/supabase'
import type { Opme } from '@/types'
import type { Database } from '@/types/database'

/** Acesso ao Supabase pra `opmes` — mesmo padrão de `ocRepository.ts` (Hardening P2). */

type OpmeRow = Database['public']['Tables']['opmes']['Row']

export function toOpme(row: OpmeRow): Opme {
  return {
    id: row.id,
    paciente: row.paciente,
    dataCirurgia: row.data_cirurgia,
    fornecedorId: row.fornecedor_id,
    hospitalId: row.hospital_id as HospitalId,
    status: row.status as StatusOpme,
    observacao: row.observacao ?? '',
  }
}

function toRow(o: Omit<Opme, 'id'> & { id?: string }) {
  return {
    id: o.id,
    paciente: o.paciente,
    data_cirurgia: o.dataCirurgia,
    fornecedor_id: o.fornecedorId,
    hospital_id: o.hospitalId,
    status: o.status,
    observacao: o.observacao,
  }
}

export async function listarOpmes(hospitalId: HospitalId): Promise<Opme[]> {
  const { data, error } = await supabase
    .from('opmes')
    .select('*')
    .eq('hospital_id', hospitalId)
    .is('deleted_at', null)
    .order('data_cirurgia')
  if (error) throw error
  return (data as OpmeRow[]).map(toOpme)
}

export async function salvarOpme(o: Omit<Opme, 'id'> & { id?: string }): Promise<void> {
  const { error } = await supabase.from('opmes').upsert(toRow(o))
  if (error) throw error
}

export async function alternarStatusOpme(id: string, status: StatusOpme): Promise<void> {
  const { error } = await supabase.from('opmes').update({ status }).eq('id', id)
  if (error) throw error
}

export async function excluirOpme(id: string): Promise<void> {
  const { error } = await supabase
    .from('opmes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
