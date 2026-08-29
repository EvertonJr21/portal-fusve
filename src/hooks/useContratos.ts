import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { HospitalId } from '@/constants'
import { supabase } from '@/lib/supabase'
import type { ContratoHeader, ContratoProduto } from '@/types'

interface ContratoRow {
  id: string
  tipo: string
  status: string
  fornecedor_nome: string
  fornecedor_cnpj: string
  contato_nome: string
  contato_email: string
  contato_whatsapp: string
  frete_tipo: string
  prazo_medio_dias: number | null
  origem_embarque: string
  tolerancia_atraso_dias: number | null
  horario_cutoff: string
  gatilho_desconto: string
  reajuste_regra: string
  vigencia_inicio: string | null
  vigencia_fim: string | null
  aviso_renovacao_dias: number
  renovacao_automatica: boolean
  hospital_id: string
  classificacao: string
  observacoes: string
}

function toContrato(row: ContratoRow): ContratoHeader {
  return {
    id: row.id,
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
    vigencia_inicio: c.vigenciaInicio,
    vigencia_fim: c.vigenciaFim,
    aviso_renovacao_dias: c.avisoRenovacaoDias,
    renovacao_automatica: c.renovacaoAutomatica,
    hospital_id: c.hospitalId,
    classificacao: c.classificacao,
    observacoes: c.observacoes,
  }
}

interface ContratoProdutoRow {
  id: string
  contrato_id: string
  sku: string
  descricao: string
  cod_soulmv: string
  preco_unitario: number
  unidade: string
  moq: number | null
  capacidade_fornecimento: number | null
  capacidade_periodo: string
  meio_pagamento: string
}

function toContratoProduto(row: ContratoProdutoRow): ContratoProduto {
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
export function useContratos(hospitalId: HospitalId) {
  return useQuery({
    queryKey: ['contratos', hospitalId],
    queryFn: async (): Promise<ContratoHeader[]> => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .in('hospital_id', [hospitalId, 'ambos'])
        .is('deleted_at', null)
        .order('fornecedor_nome')
      if (error) throw error
      return (data as ContratoRow[]).map(toContrato)
    },
  })
}

export function useContratoProdutos(contratoId: string | null) {
  return useQuery({
    queryKey: ['contrato-produtos', contratoId],
    enabled: !!contratoId,
    queryFn: async (): Promise<ContratoProduto[]> => {
      const { data, error } = await supabase
        .from('contrato_produtos')
        .select('*')
        .eq('contrato_id', contratoId as string)
        .is('deleted_at', null)
        .order('descricao')
      if (error) throw error
      return (data as ContratoProdutoRow[]).map(toContratoProduto)
    },
  })
}

export function useSalvarContrato(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (c: ContratoHeader) => {
      const { error } = await supabase.from('contratos').upsert(toContratoRow(c))
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', hospitalId] })
    },
  })
}

export function useSalvarProdutosContrato() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      produtosAtuais,
      produtosOriginais,
    }: {
      contratoId: string
      produtosAtuais: ContratoProduto[]
      produtosOriginais: ContratoProduto[]
    }) => {
      const idsAtuais = new Set(produtosAtuais.map((p) => p.id))
      const removidos = produtosOriginais.filter((p) => !idsAtuais.has(p.id))

      if (produtosAtuais.length) {
        const { error } = await supabase.from('contrato_produtos').upsert(produtosAtuais.map(toContratoProdutoRow))
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
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contrato-produtos', variables.contratoId] })
    },
  })
}

export function useExcluirContrato(hospitalId: HospitalId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contratos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', hospitalId] })
    },
  })
}
