import { fromInput, toInput } from '@/utils/date'
import type { HospitalId } from '@/constants'
import { supabase } from '@/lib/supabase'
import type { OC, SituacaoOC } from '@/types'
import type { Database } from '@/types/database'

/**
 * Acesso ao Supabase pra `ocs` — nenhum SQL/mapeamento snake↔camel deve viver
 * em `src/hooks/useOCs.ts`, só chamadas a este arquivo (ver CLAUDE_ENGINEERING.md,
 * seções 15-17: hooks são adaptadores React, não camada de infraestrutura).
 *
 * Primeira entidade migrada pra esse padrão (Hardening P2) — as outras tabelas
 * (sols, forns, contratos, pareceres, opmes...) continuam com Supabase direto
 * dentro do hook por enquanto, migração é gradual (Strangler Pattern), não
 * big-bang.
 *
 * Fase 2 (completa) + Passo 6 da migração de datas texto→date (CLAUDE.md,
 * "Migração de Datas Texto → Date") — as 5 colunas de data de `ocs`
 * alimentam toda a lógica de prazo/risco em `src/utils/oc.ts`, por isso
 * ficaram por último no processo. Depois da Fase 2 (ler/escrever as duas
 * colunas) rodar em produção sem incidentes, o app agora só lê/escreve as
 * colunas `date` nativas (`*_date`) — as 5 colunas texto legadas
 * (`data_solic`/`previsao_forn`/`previsao_forn2`/`data_entrega_real`/
 * `ultima_movimentacao`) não são mais tocadas por este repository, só ficam
 * de fora no banco até a migration de `DROP COLUMN` (passo 6) rodar.
 * `dataSolic` nunca é alterada via `atualizarCamposOC` (só definida na
 * criação), então só precisa do tratamento em `toOC`/`toRow`/`criarOCImportada`
 * — não no mapa de patch.
 */

type OCRow = Database['public']['Tables']['ocs']['Row']
type OCInsert = Database['public']['Tables']['ocs']['Insert']
type OCUpdate = Database['public']['Tables']['ocs']['Update']

/** `DD/MM/YYYY` → `YYYY-MM-DD` (coluna `date` nativa) ou `null`. */
function paraColunaDate(texto: string | null | undefined): string | null {
  return texto ? toInput(texto) || null : null
}

/** `YYYY-MM-DD` (coluna `date` nativa) → `DD/MM/YYYY` ou `null`, preservando null (não vira ''). */
function deColunaDate(data: string | null): string | null {
  return data ? fromInput(data) : null
}

export function toOC(row: OCRow): OC {
  return {
    id: row.id,
    dataSolic: deColunaDate(row.data_solic_date),
    fornecedorNome: row.fornecedor_nome ?? '',
    fornecedorId: row.fornecedor_id,
    sit: (row.sit ?? 'Autorizada') as SituacaoOC,
    estoque: row.estoque,
    solicitacaoId: row.solicitacao_id,
    cobrado: row.cobrado ?? false,
    previsaoForn: deColunaDate(row.previsao_forn_date),
    previsaoForn2: deColunaDate(row.previsao_forn2_date),
    dataEntregaReal: deColunaDate(row.data_entrega_real_date),
    diasAtraso: row.dias_atraso ?? 0,
    hospitalId: row.hospital_id as HospitalId,
    proximaAcao: row.proxima_acao,
    motivoAtraso: row.motivo_atraso,
    ultimaMovimentacao: deColunaDate(row.ultima_movimentacao_date),
    previsaoDescumprida: row.previsao_descumprida ?? false,
  }
}

function toRow(oc: Partial<OC> & Pick<OC, 'id' | 'dataSolic' | 'fornecedorNome' | 'hospitalId'>): OCInsert {
  return {
    id: oc.id,
    data_solic_date: paraColunaDate(oc.dataSolic),
    fornecedor_nome: oc.fornecedorNome,
    fornecedor_id: oc.fornecedorId ?? null,
    sit: oc.sit ?? 'Autorizada',
    estoque: oc.estoque ?? 'SUP CAF',
    solicitacao_id: oc.solicitacaoId ?? null,
    cobrado: oc.cobrado ?? false,
    previsao_forn_date: paraColunaDate(oc.previsaoForn),
    previsao_forn2_date: paraColunaDate(oc.previsaoForn2),
    data_entrega_real_date: paraColunaDate(oc.dataEntregaReal),
    dias_atraso: oc.diasAtraso ?? 0,
    hospital_id: oc.hospitalId,
    proxima_acao: oc.proximaAcao ?? null,
    motivo_atraso: oc.motivoAtraso ?? null,
    ultima_movimentacao_date: paraColunaDate(oc.ultimaMovimentacao),
    previsao_descumprida: oc.previsaoDescumprida ?? false,
  }
}

export async function listarOCs(hospitalId: HospitalId): Promise<OC[]> {
  const { data, error } = await supabase
    .from('ocs')
    .select('*')
    .eq('hospital_id', hospitalId)
    .is('deleted_at', null)
    .order('id', { ascending: false })
  if (error) throw error
  return (data as OCRow[]).map(toOC)
}

export interface SalvarOCInput {
  id: number
  dataSolic: string
  fornecedorNome: string
  fornecedorId?: number | null
  sit: SituacaoOC
  estoque?: string | null
  previsaoForn?: string | null
  previsaoForn2?: string | null
  hospitalId: HospitalId
}

export async function salvarOC(input: SalvarOCInput): Promise<void> {
  const { error } = await supabase
    .from('ocs')
    .upsert(toRow({ ...input, fornecedorNome: input.fornecedorNome.trim().toUpperCase() }))
  if (error) throw error
}

export async function atualizarSituacaoOC(id: number, sit: SituacaoOC): Promise<void> {
  const { error } = await supabase.from('ocs').update({ sit }).eq('id', id)
  if (error) throw error
}

export interface OCImportadaInput {
  id: number
  dataSolic: string | null
  fornecedorNome: string
  fornecedorId: number
  sit: string
  estoque: string
  solicitacaoId: number | null
  previsaoForn: string | null
  diasAtraso: number
  hospitalId: HospitalId
  ultimaMovimentacao: string | null
  dataEntregaReal?: string | null
}

/**
 * Cria uma OC a partir de importação (CSV novo ou vínculo do PDF de
 * Acompanhamento) — defaults (`cobrado: false`, `proxima_acao`/`motivo_atraso`
 * vazios, `previsao_descumprida: false`) são intencionalmente diferentes dos
 * de `salvarOC` (formulário manual usa `null`), então não reaproveita
 * `toRow`/`salvarOC` pra não mudar esse comportamento silenciosamente.
 */
export async function criarOCImportada(input: OCImportadaInput): Promise<void> {
  const { error } = await supabase.from('ocs').insert({
    id: input.id,
    data_solic_date: paraColunaDate(input.dataSolic),
    fornecedor_nome: input.fornecedorNome,
    fornecedor_id: input.fornecedorId,
    sit: input.sit,
    estoque: input.estoque,
    solicitacao_id: input.solicitacaoId,
    cobrado: false,
    previsao_forn_date: paraColunaDate(input.previsaoForn),
    dias_atraso: input.diasAtraso,
    hospital_id: input.hospitalId,
    proxima_acao: '',
    motivo_atraso: '',
    ultima_movimentacao_date: paraColunaDate(input.ultimaMovimentacao),
    previsao_descumprida: false,
    data_entrega_real_date: paraColunaDate(input.dataEntregaReal ?? null),
  })
  if (error) throw error
}

const PATCH_FIELD_MAP: Partial<Record<keyof OC, keyof OCRow>> = {
  solicitacaoId: 'solicitacao_id',
  cobrado: 'cobrado',
  diasAtraso: 'dias_atraso',
  proximaAcao: 'proxima_acao',
  motivoAtraso: 'motivo_atraso',
  previsaoDescumprida: 'previsao_descumprida',
  sit: 'sit',
  fornecedorNome: 'fornecedor_nome',
  fornecedorId: 'fornecedor_id',
}

/** Campos de data com coluna `_date` irmã — mantidos em sincronia em todo patch parcial. */
const DATE_PATCH_FIELD_MAP: Partial<Record<keyof OC, keyof OCRow>> = {
  previsaoForn: 'previsao_forn_date',
  previsaoForn2: 'previsao_forn2_date',
  dataEntregaReal: 'data_entrega_real_date',
  ultimaMovimentacao: 'ultima_movimentacao_date',
}

/** Atualização parcial de campos operacionais (histórico, vínculo, cobrança) — não é o form de criar/editar. */
export async function atualizarCamposOC(id: number, patch: Partial<OC>): Promise<void> {
  const row: OCUpdate = {}
  for (const [key, value] of Object.entries(patch)) {
    const column = PATCH_FIELD_MAP[key as keyof OC]
    if (column) (row as Record<string, unknown>)[column] = value
    const dateColumn = DATE_PATCH_FIELD_MAP[key as keyof OC]
    if (dateColumn) (row as Record<string, unknown>)[dateColumn] = paraColunaDate(value as string | null)
  }
  const { error } = await supabase.from('ocs').update(row).eq('id', id)
  if (error) throw error
}

export async function excluirOC(id: number): Promise<void> {
  const { error } = await supabase
    .from('ocs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
