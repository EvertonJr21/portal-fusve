import { supabase } from '@/lib/supabase'
import type { HistOC } from '@/types'
import type { Database } from '@/types/database'

/** Acesso ao Supabase pra `hist_oc` — mesmo padrão de `ocRepository.ts` (Hardening P2). */

type HistOCRow = Database['public']['Tables']['hist_oc']['Row']

export function toHistOC(row: HistOCRow): HistOC {
  return {
    hid: row.hid,
    ocId: row.oc_id ?? 0,
    ts: row.ts ?? 0,
    canal: (row.canal ?? 'mail') as HistOC['canal'],
    resposta: row.resposta ?? '',
    tipo: (row.tipo ?? 'individual') as HistOC['tipo'],
    respondidoEm: row.respondido_em ? new Date(row.respondido_em).getTime() : null,
  }
}

export async function listarHistOC(ocId: number): Promise<HistOC[]> {
  const { data, error } = await supabase
    .from('hist_oc')
    .select('*')
    .eq('oc_id', ocId)
    .order('ts', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data as HistOCRow[]).map(toHistOC)
}

/** Última cobrança de cada OC, numa query só — evita N+1 ao popular os cards da Central de Pendências. */
export async function listarHistoricoRecentePorOC(ocIds: number[]): Promise<Map<number, HistOC>> {
  const { data, error } = await supabase
    .from('hist_oc')
    .select('*')
    .in('oc_id', ocIds)
    .order('ts', { ascending: false })
  if (error) throw error
  const mapa = new Map<number, HistOC>()
  for (const row of data as HistOCRow[]) {
    const ocId = row.oc_id ?? 0
    if (!mapa.has(ocId)) mapa.set(ocId, toHistOC(row))
  }
  return mapa
}

/** Toda a tabela hist_oc — só pra agregação de score de fornecedor, não pro dia a dia. */
export async function listarHistoricoTodos(): Promise<HistOC[]> {
  const { data, error } = await supabase.from('hist_oc').select('*').order('ts', { ascending: false }).limit(5000)
  if (error) throw error
  return (data as HistOCRow[]).map(toHistOC)
}

export interface RegistrarCobrancaInput {
  ocId: number
  canal: HistOC['canal']
  resposta?: string
  tipo: HistOC['tipo']
}

export async function registrarCobranca(input: RegistrarCobrancaInput): Promise<void> {
  const { error } = await supabase.from('hist_oc').insert({
    oc_id: input.ocId,
    ts: Date.now(),
    canal: input.canal,
    resposta: input.resposta ?? '',
    tipo: input.tipo,
  })
  if (error) throw error
}

/** Marca a cobrança como respondida pelo fornecedor — ação rápida de 1 clique (spec item 15). */
export async function marcarRespondida(hid: number): Promise<void> {
  const { error } = await supabase
    .from('hist_oc')
    .update({ respondido_em: new Date().toISOString() })
    .eq('hid', hid)
  if (error) throw error
}
