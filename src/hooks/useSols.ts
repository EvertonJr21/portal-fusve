import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { HospitalId } from '@/constants'
import { supabase } from '@/lib/supabase'
import type { Solicitacao } from '@/types'

interface SolRow {
  id: number
  data: string | null
  produto: string
  motivo: string
  solicitante: string
  qtd: number
  sit: string
  hospital_id: string
}

function toSolicitacao(row: SolRow): Solicitacao {
  return {
    id: row.id,
    data: row.data,
    produto: row.produto,
    motivo: row.motivo,
    solicitante: row.solicitante,
    qtd: row.qtd,
    sit: row.sit,
    hospitalId: row.hospital_id as HospitalId,
  }
}

export function useSols(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['sols', hospitalId],
    queryFn: async (): Promise<Solicitacao[]> => {
      const { data, error } = await supabase
        .from('sols')
        .select('*')
        .eq('hospital_id', hospitalId)
        .is('deleted_at', null)
        .order('id', { ascending: false })
      if (error) throw error
      return (data as SolRow[]).map(toSolicitacao)
    },
  })
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

export function useSalvarSol(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SalvarSolInput) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sols', hospitalId] })
    },
  })
}

export function useAtualizarSituacaoSol(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, sit }: { id: number; sit: string }) => {
      const { error } = await supabase.from('sols').update({ sit }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sols', hospitalId] })
    },
  })
}

export function useExcluirSol(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('sols')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sols', hospitalId] })
    },
  })
}
