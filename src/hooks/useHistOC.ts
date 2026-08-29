import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { HistOC } from '@/types'

interface HistOCRow {
  hid: number
  oc_id: number
  ts: number
  canal: string
  resposta: string
  tipo: string
  respondido_em: string | null
}

function toHistOC(row: HistOCRow): HistOC {
  return {
    hid: row.hid,
    ocId: row.oc_id,
    ts: row.ts,
    canal: row.canal as HistOC['canal'],
    resposta: row.resposta,
    tipo: row.tipo as HistOC['tipo'],
    respondidoEm: row.respondido_em ? new Date(row.respondido_em).getTime() : null,
  }
}

export function useHistOC(ocId: number | null) {
  return useQuery({
    queryKey: ['hist_oc', ocId],
    enabled: ocId !== null,
    queryFn: async (): Promise<HistOC[]> => {
      const { data, error } = await supabase
        .from('hist_oc')
        .select('*')
        .eq('oc_id', ocId as number)
        .order('ts', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data as HistOCRow[]).map(toHistOC)
    },
  })
}

/** Última cobrança de cada OC, numa query só — evita N+1 ao popular os cards da Central de Pendências. */
export function useHistoricoRecentePorOC(ocIds: number[]) {
  const ids = [...ocIds].sort((a, b) => a - b)
  return useQuery({
    queryKey: ['hist-recente', ids],
    enabled: ids.length > 0,
    queryFn: async (): Promise<Map<number, HistOC>> => {
      const { data, error } = await supabase
        .from('hist_oc')
        .select('*')
        .in('oc_id', ids)
        .order('ts', { ascending: false })
      if (error) throw error
      const mapa = new Map<number, HistOC>()
      for (const row of data as HistOCRow[]) {
        if (!mapa.has(row.oc_id)) mapa.set(row.oc_id, toHistOC(row))
      }
      return mapa
    },
  })
}

/** Toda a tabela hist_oc — só pra agregação de score de fornecedor, não pro dia a dia. */
export function useHistoricoTodos() {
  return useQuery({
    queryKey: ['hist-todos'],
    queryFn: async (): Promise<HistOC[]> => {
      const { data, error } = await supabase.from('hist_oc').select('*').order('ts', { ascending: false }).limit(5000)
      if (error) throw error
      return (data as HistOCRow[]).map(toHistOC)
    },
    staleTime: 60_000,
  })
}

export interface RegistrarCobrancaInput {
  ocId: number
  canal: HistOC['canal']
  resposta?: string
  tipo: HistOC['tipo']
}

export function useRegistrarCobranca() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RegistrarCobrancaInput) => {
      const { error } = await supabase.from('hist_oc').insert({
        oc_id: input.ocId,
        ts: Date.now(),
        canal: input.canal,
        resposta: input.resposta ?? '',
        tipo: input.tipo,
      })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hist_oc', variables.ocId] })
      queryClient.invalidateQueries({ queryKey: ['hist-recente'] })
    },
  })
}

/** Marca a cobrança como respondida pelo fornecedor — ação rápida de 1 clique (spec item 15). */
export function useMarcarRespondida() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ hid }: { hid: number; ocId: number }) => {
      const { error } = await supabase
        .from('hist_oc')
        .update({ respondido_em: new Date().toISOString() })
        .eq('hid', hid)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hist_oc', variables.ocId] })
      queryClient.invalidateQueries({ queryKey: ['hist-recente'] })
    },
  })
}
