import type { HospitalId } from '@/constants'
import { supabase } from '@/lib/supabase'
import type { ContratoComodato, ContratoHeader, ContratoProduto } from '@/types'
import type { Database } from '@/types/database'

/** Acesso ao Supabase pra `contratos`/`contrato_produtos` — mesmo padrão de `ocRepository.ts` (Hardening P2). */

type ContratoRow = Database['public']['Tables']['contratos']['Row']
type ContratoProdutoRow = Database['public']['Tables']['contrato_produtos']['Row']
type ContratoComodatoRow = Database['public']['Tables']['contrato_comodatos']['Row']

export function toContrato(row: ContratoRow): ContratoHeader {
  return {
    id: row.id,
    titulo: row.titulo ?? '',
    tipo: row.tipo as ContratoHeader['tipo'],
    status: row.status as ContratoHeader['status'],
    fornecedorNome: row.fornecedor_nome,
    fornecedorCnpj: row.fornecedor_cnpj ?? '',
    contatoNome: row.contato_nome ?? '',
    contatoEmail: row.contato_email ?? '',
    contatoWhatsapp: row.contato_whatsapp ?? '',
    freteTipo: (row.frete_tipo as ContratoHeader['freteTipo']) ?? '',
    prazoMedioDias: row.prazo_medio_dias,
    origemEmbarque: row.origem_embarque ?? '',
    toleranciaAtrasoDias: row.tolerancia_atraso_dias,
    horarioCutoff: row.horario_cutoff ?? '',
    gatilhoDesconto: row.gatilho_desconto ?? '',
    reajusteRegra: row.reajuste_regra ?? '',
    condicaoPagamento: row.condicao_pagamento ?? '',
    vigenciaInicio: row.vigencia_inicio,
    vigenciaFim: row.vigencia_fim,
    avisoRenovacaoDias: row.aviso_renovacao_dias ?? 60,
    renovacaoAutomatica: row.renovacao_automatica ?? false,
    hospitalId: row.hospital_id as ContratoHeader['hospitalId'],
    classificacao: row.classificacao ?? '',
    observacoes: row.observacoes ?? '',
  }
}

function toContratoRow(c: ContratoHeader) {
  return {
    id: c.id,
    titulo: c.titulo.trim(),
    tipo: c.tipo,
    status: c.status,
    fornecedor_nome: c.fornecedorNome,
    fornecedor_cnpj: c.fornecedorCnpj,
    contato_nome: c.contatoNome,
    contato_email: c.contatoEmail,
    contato_whatsapp: c.contatoWhatsapp,
    frete_tipo: c.freteTipo,
    prazo_medio_dias: c.prazoMedioDias,
    origem_embarque: c.origemEmbarque,
    tolerancia_atraso_dias: c.toleranciaAtrasoDias,
    horario_cutoff: c.horarioCutoff,
    gatilho_desconto: c.gatilhoDesconto,
    reajuste_regra: c.reajusteRegra,
    condicao_pagamento: c.condicaoPagamento.trim(),
    vigencia_inicio: c.vigenciaInicio,
    vigencia_fim: c.vigenciaFim,
    aviso_renovacao_dias: c.avisoRenovacaoDias,
    renovacao_automatica: c.renovacaoAutomatica,
    hospital_id: c.hospitalId,
    classificacao: c.classificacao,
    observacoes: c.observacoes,
  }
}

export function toContratoProduto(row: ContratoProdutoRow): ContratoProduto {
  return {
    id: row.id,
    contratoId: row.contrato_id,
    sku: row.sku ?? '',
    descricao: row.descricao,
    codSoulmv: row.cod_soulmv ?? '',
    precoUnitario: row.preco_unitario ?? 0,
    unidade: row.unidade ?? 'UNIDADE',
    moq: row.moq,
    capacidadeFornecimento: row.capacidade_fornecimento,
    capacidadePeriodo: (row.capacidade_periodo as ContratoProduto['capacidadePeriodo']) ?? 'mes',
    meioPagamento: row.meio_pagamento ?? '',
  }
}

function toContratoProdutoRow(p: ContratoProduto) {
  return {
    id: p.id,
    contrato_id: p.contratoId,
    sku: p.sku,
    descricao: p.descricao,
    cod_soulmv: p.codSoulmv,
    preco_unitario: p.precoUnitario,
    unidade: p.unidade,
    moq: p.moq,
    capacidade_fornecimento: p.capacidadeFornecimento,
    capacidade_periodo: p.capacidadePeriodo,
    meio_pagamento: p.meioPagamento,
  }
}

/** Contratos são visíveis por hospital específico ou 'ambos'. */
export async function listarContratos(hospitalId: HospitalId): Promise<ContratoHeader[]> {
  const { data, error } = await supabase
    .from('contratos')
    .select('*')
    .in('hospital_id', [hospitalId, 'ambos'])
    .is('deleted_at', null)
    .order('fornecedor_nome')
    .order('titulo')
  if (error) throw error
  return (data as ContratoRow[]).map(toContrato)
}

export async function listarContratoProdutos(contratoId: string): Promise<ContratoProduto[]> {
  const { data, error } = await supabase
    .from('contrato_produtos')
    .select('*')
    .eq('contrato_id', contratoId)
    .is('deleted_at', null)
    .order('descricao')
  if (error) throw error
  return (data as ContratoProdutoRow[]).map(toContratoProduto)
}

export async function salvarContrato(c: ContratoHeader): Promise<void> {
  const { error } = await supabase.from('contratos').upsert(toContratoRow(c))
  if (error) throw error
}

export interface SalvarProdutosContratoInput {
  contratoId: string
  produtosAtuais: ContratoProduto[]
  produtosOriginais: ContratoProduto[]
}

/** Sincroniza os produtos de um contrato: upsert dos atuais, soft-delete dos removidos (diff contra os originais). */
export async function salvarProdutosContrato(input: SalvarProdutosContratoInput): Promise<void> {
  const idsAtuais = new Set(input.produtosAtuais.map((p) => p.id))
  const removidos = input.produtosOriginais.filter((p) => !idsAtuais.has(p.id))

  if (input.produtosAtuais.length) {
    const { error } = await supabase.from('contrato_produtos').upsert(input.produtosAtuais.map(toContratoProdutoRow))
    if (error) throw error
  }
  if (removidos.length) {
    const { error } = await supabase
      .from('contrato_produtos')
      .update({ deleted_at: new Date().toISOString() })
      .in(
        'id',
        removidos.map((p) => p.id),
      )
    if (error) throw error
  }
}

export async function excluirContrato(id: string): Promise<void> {
  const { error } = await supabase
    .from('contratos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ── Equipamentos em comodato (item 83) ──

export function toContratoComodato(row: ContratoComodatoRow): ContratoComodato {
  return {
    id: row.id,
    contratoId: row.contrato_id,
    equipamento: row.equipamento,
    fabricanteModelo: row.fabricante_modelo ?? '',
    numeroSerie: row.numero_serie ?? '',
    patrimonio: row.patrimonio ?? '',
    quantidade: row.quantidade ?? 1,
    localInstalacao: row.local_instalacao ?? '',
    dataInstalacao: row.data_instalacao,
    valorEstimado: row.valor_estimado,
    observacao: row.observacao ?? '',
  }
}

function toContratoComodatoRow(c: ContratoComodato) {
  return {
    id: c.id,
    contrato_id: c.contratoId,
    equipamento: c.equipamento.trim(),
    fabricante_modelo: c.fabricanteModelo,
    numero_serie: c.numeroSerie,
    patrimonio: c.patrimonio,
    quantidade: c.quantidade > 0 ? c.quantidade : 1,
    local_instalacao: c.localInstalacao,
    data_instalacao: c.dataInstalacao || null,
    valor_estimado: c.valorEstimado,
    observacao: c.observacao,
    updated_at: new Date().toISOString(),
  }
}

export async function listarContratoComodatos(contratoId: string): Promise<ContratoComodato[]> {
  const { data, error } = await supabase
    .from('contrato_comodatos')
    .select('*')
    .eq('contrato_id', contratoId)
    .is('deleted_at', null)
    .order('created_at')
  if (error) throw error
  return (data as ContratoComodatoRow[]).map(toContratoComodato)
}

export interface SalvarComodatosInput {
  contratoId: string
  atuais: ContratoComodato[]
  originais: ContratoComodato[]
}

/** Mesmo diff de `salvarProdutosContrato`: upsert dos atuais, soft-delete dos removidos. Sem mudança → nenhuma chamada. */
export async function salvarComodatosContrato(input: SalvarComodatosInput): Promise<void> {
  const idsAtuais = new Set(input.atuais.map((c) => c.id))
  const removidos = input.originais.filter((c) => !idsAtuais.has(c.id))
  if (input.atuais.length) {
    const { error } = await supabase.from('contrato_comodatos').upsert(input.atuais.map(toContratoComodatoRow))
    if (error) throw error
  }
  if (removidos.length) {
    const { error } = await supabase
      .from('contrato_comodatos')
      .update({ deleted_at: new Date().toISOString() })
      .in(
        'id',
        removidos.map((c) => c.id),
      )
    if (error) throw error
  }
}

/** Quantidade de equipamentos (soma das quantidades) por contrato. */
export async function contarComodatosPorContrato(contratoIds: string[]): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('contrato_comodatos')
    .select('contrato_id, quantidade')
    .in('contrato_id', contratoIds)
    .is('deleted_at', null)
  if (error) throw error
  const mapa = new Map<string, number>()
  for (const r of data as { contrato_id: string; quantidade: number }[]) {
    mapa.set(r.contrato_id, (mapa.get(r.contrato_id) ?? 0) + (r.quantidade ?? 1))
  }
  return mapa
}
