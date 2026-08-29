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
}

function toHistOC(row: HistOCRow): HistOC {
  return {
    hid: row.hid,
    ocId: row.oc_id,
    ts: row.ts,
    canal: row.canal as HistOC['canal'],
    resposta: row.resposta,
    tipo: row.tipo as HistOC['tipo'],
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
    },
  })
}
