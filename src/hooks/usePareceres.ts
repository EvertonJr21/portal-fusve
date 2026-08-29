import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Parecer } from '@/types'

interface ParecerRow {
  cod: string
  nome: string
  cat: string
  padrao: string[]
  permitidas: string[]
  restritas: string[]
  proibidas: string[]
  observacao: string
  responsavel: string
  data_parecer: string
  parecer: string
  pdf_data_url: string | null
}

function toParecer(row: ParecerRow): Parecer {
  return {
    cod: row.cod,
    nome: row.nome,
    cat: row.cat,
    padrao: row.padrao ?? [],
    permitidas: row.permitidas ?? [],
    restritas: row.restritas ?? [],
    proibidas: row.proibidas ?? [],
    observacao: row.observacao ?? '',
    responsavel: row.responsavel ?? '',
    dataParecer: row.data_parecer ?? '',
    parecer: row.parecer ?? '',
    pdfDataUrl: row.pdf_data_url,
  }
}

function toRow(p: Parecer) {
  return {
    cod: p.cod,
    nome: p.nome,
    cat: p.cat,
    padrao: p.padrao,
    permitidas: p.permitidas,
    restritas: p.restritas,
    proibidas: p.proibidas,
    observacao: p.observacao,
    responsavel: p.responsavel,
    data_parecer: p.dataParecer,
    parecer: p.parecer,
    pdf_data_url: p.pdfDataUrl,
  }
}

/** Pareceres são compartilhados entre hospitais — sem filtro de hospital_id. */
export function usePareceres() {
  return useQuery({
    queryKey: ['pareceres'],
    queryFn: async (): Promise<Parecer[]> => {
      const { data, error } = await supabase.from('pareceres').select('*').order('cod')
      if (error) throw error
      return (data as ParecerRow[]).map(toParecer)
    },
  })
}

export function useParecer(cod: string | null) {
  return useQuery({
    queryKey: ['parecer', cod],
    enabled: !!cod,
    queryFn: async (): Promise<Parecer | null> => {
      const { data, error } = await supabase.from('pareceres').select('*').eq('cod', cod as string).maybeSingle()
      if (error) throw error
      return data ? toParecer(data as ParecerRow) : null
    },
  })
}

export function useSalvarParecer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (p: Parecer) => {
      const { error } = await supabase.from('pareceres').upsert(toRow(p))
      if (error) throw error
    },
    onSuccess: (_data, p) => {
      queryClient.invalidateQueries({ queryKey: ['pareceres'] })
      queryClient.invalidateQueries({ queryKey: ['parecer', p.cod] })
    },
  })
}

export function useExcluirParecer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (cod: string) => {
      const { error } = await supabase.from('pareceres').delete().eq('cod', cod)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pareceres'] })
    },
  })
}
