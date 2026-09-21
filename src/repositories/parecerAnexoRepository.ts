import { supabase } from '@/lib/supabase'
import { BUCKET_PDFS } from './parecerRepository'
import type { ParecerAnexo, MarcaCategoria } from '@/types'
import type { Database } from '@/types/database'

/**
 * Acesso ao Supabase pra `parecer_anexos` — PDFs vinculados a uma marca
 * específica de um parecer (não ao parecer inteiro, como `pareceres.pdf_path`
 * legado). Um parecer pode ter vários — um por marca proibida/restrita, por
 * exemplo. Mesmo padrão de repository do resto do projeto (Hardening P2).
 *
 * Soft delete (regra 6 do CLAUDE.md) — diferente de `excluirParecer`, que é
 * uma violação pré-existente documentada, este repository é novo e segue a
 * regra desde o início.
 */

type AnexoRow = Database['public']['Tables']['parecer_anexos']['Row']

function toParecerAnexo(row: AnexoRow): ParecerAnexo {
  return {
    id: row.id,
    parecerCod: row.parecer_cod,
    categoria: row.categoria as MarcaCategoria,
    marca: row.marca,
    pdfPath: row.pdf_path,
    nomeArquivo: row.nome_arquivo,
    createdAt: row.created_at ?? '',
  }
}

/** Envia o PDF pro Storage (mesmo bucket de `pareceres.pdf_path`) e devolve o `path`. */
export async function uploadPdf(cod: string, categoria: MarcaCategoria, marca: string, file: File): Promise<string> {
  const path = `${cod}/${categoria}/${marca}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from(BUCKET_PDFS).upload(path, file, {
    contentType: 'application/pdf',
    upsert: false,
  })
  if (error) throw error
  return path
}

/** Todos os anexos de todos os pareceres — pareceres é uma tabela pequena e sem paginação, mesmo padrão de `listarPareceres`. */
export async function listarTodosAnexos(): Promise<ParecerAnexo[]> {
  const { data, error } = await supabase.from('parecer_anexos').select('*').is('deleted_at', null).order('created_at')
  if (error) throw error
  return (data as AnexoRow[]).map(toParecerAnexo)
}

export async function listarAnexosPorParecer(cod: string): Promise<ParecerAnexo[]> {
  const { data, error } = await supabase
    .from('parecer_anexos')
    .select('*')
    .eq('parecer_cod', cod)
    .is('deleted_at', null)
    .order('created_at')
  if (error) throw error
  return (data as AnexoRow[]).map(toParecerAnexo)
}

interface SalvarAnexoInput {
  parecerCod: string
  categoria: MarcaCategoria
  marca: string
  file: File
}

export async function salvarAnexo({ parecerCod, categoria, marca, file }: SalvarAnexoInput): Promise<void> {
  const path = await uploadPdf(parecerCod, categoria, marca, file)
  const { error } = await supabase.from('parecer_anexos').insert({
    parecer_cod: parecerCod,
    categoria,
    marca,
    pdf_path: path,
    nome_arquivo: file.name,
  })
  if (error) throw error
}

export async function excluirAnexo(id: string): Promise<void> {
  const { error } = await supabase.from('parecer_anexos').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
