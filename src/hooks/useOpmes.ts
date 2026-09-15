import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { HospitalId, StatusOpme } from '@/constants'
import { supabase } from '@/lib/supabase'
import type { Opme } from '@/types'

interface OpmeRow {
  id: string
  paciente: string
  data_cirurgia: string
  fornecedor_id: number | null
  hospital_id: string
  status: string
  observacao: string | null
}

function toOpme(row: OpmeRow): Opme {
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

function toOpmeRow(o: Omit<Opme, 'id'> & { id?: string }) {
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

export function useOpmes(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['opmes', hospitalId],
    queryFn: async (): Promise<Opme[]> => {
      const { data, error } = await supabase
        .from('opmes')
        .select('*')
        .eq('hospital_id', hospitalId)
        .is('deleted_at', null)
        .order('data_cirurgia')
      if (error) throw error
      return (data as OpmeRow[]).map(toOpme)
    },
  })
}

export function useSalvarOpme(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (o: Omit<Opme, 'id'> & { id?: string }) => {
      const { error } = await supabase.from('opmes').upsert(toOpmeRow(o))
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opmes', hospitalId] })
    },
  })
}

export function useAlternarStatusOpme(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusOpme }) => {
      const { error } = await supabase.from('opmes').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opmes', hospitalId] })
    },
  })
}

export function useExcluirOpme(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('opmes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opmes', hospitalId] })
    },
  })
}
