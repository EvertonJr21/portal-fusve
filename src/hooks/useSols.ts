import { useQuery } from '@tanstack/react-query'
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
