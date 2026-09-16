import { supabase } from '@/lib/supabase'
import type { Parecer } from '@/types'
import type { Database } from '@/types/database'

/**
 * Acesso ao Supabase pra `pareceres` — mesmo padrão de `ocRepository.ts` (Hardening P2).
 *
 * Nota: `excluirParecer` usa `DELETE` físico, não soft delete — comportamento
 * já existente antes desta migração, preservado tal como estava (mudar pra
 * soft delete é uma decisão de produto separada, não parte de um refactor
 * de camadas; ver regra 6 do CLAUDE.md, que hoje é violada só aqui).
 */

type ParecerRow = Database['public']['Tables']['pareceres']['Row']

export function toParecer(row: ParecerRow): Parecer {
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
export async function listarPareceres(): Promise<Parecer[]> {
  const { data, error } = await supabase.from('pareceres').select('*').order('cod')
  if (error) throw error
  return (data as ParecerRow[]).map(toParecer)
}

export async function buscarParecer(cod: string): Promise<Parecer | null> {
  const { data, error } = await supabase.from('pareceres').select('*').eq('cod', cod).maybeSingle()
  if (error) throw error
  return data ? toParecer(data as ParecerRow) : null
}

export async function salvarParecer(p: Parecer): Promise<void> {
  const { error } = await supabase.from('pareceres').upsert(toRow(p))
  if (error) throw error
}

export async function excluirParecer(cod: string): Promise<void> {
  const { error } = await supabase.from('pareceres').delete().eq('cod', cod)
  if (error) throw error
}
