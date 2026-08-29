import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { HospitalId } from '@/constants'
import { supabase } from '@/lib/supabase'
import type { OC, SituacaoOC } from '@/types'

/** Linha crua da tabela `ocs` no Supabase (snake_case). */
interface OCRow {
  id: number
  data_solic: string | null
  fornecedor_nome: string
  fornecedor_id: number | null
  sit: string
  estoque: string | null
  solicitacao_id: number | null
  cobrado: boolean
  previsao_forn: string | null
  previsao_forn2: string | null
  data_entrega_real: string | null
  dias_atraso: number
  hospital_id: string
  proxima_acao: string | null
  motivo_atraso: string | null
  ultima_movimentacao: string | null
  previsao_descumprida: boolean
}

function toOC(row: OCRow): OC {
  return {
    id: row.id,
    dataSolic: row.data_solic,
    fornecedorNome: row.fornecedor_nome,
    fornecedorId: row.fornecedor_id,
    sit: row.sit as SituacaoOC,
    estoque: row.estoque,
    solicitacaoId: row.solicitacao_id,
    cobrado: row.cobrado,
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

function toRow(oc: Partial<OC> & Pick<OC, 'id' | 'dataSolic' | 'fornecedorNome' | 'hospitalId'>) {
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

export function useOCs(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['ocs', hospitalId],
    queryFn: async (): Promise<OC[]> => {
      const { data, error } = await supabase
        .from('ocs')
        .select('*')
        .eq('hospital_id', hospitalId)
        .is('deleted_at', null)
        .order('id', { ascending: false })
      if (error) throw error
      return (data as OCRow[]).map(toOC)
    },
  })
}

export interface SalvarOCInput {
  id: number
  dataSolic: string
  fornecedorNome: string
  fornecedorId?: number | null
  sit: SituacaoOC
  estoque?: string | null
  previsaoForn?: string | null
  hospitalId: HospitalId
}

export function useSalvarOC(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SalvarOCInput) => {
      const { error } = await supabase
        .from('ocs')
        .upsert(toRow({ ...input, fornecedorNome: input.fornecedorNome.trim().toUpperCase() }))
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    },
  })
}

export function useAtualizarSituacaoOC(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, sit }: { id: number; sit: SituacaoOC }) => {
      const { error } = await supabase.from('ocs').update({ sit }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    },
  })
}

export function useExcluirOC(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('ocs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocs', hospitalId] })
    },
  })
}
