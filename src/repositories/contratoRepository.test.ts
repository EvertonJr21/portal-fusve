import { describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'
import { toContrato, toContratoProduto } from './contratoRepository'

type ContratoRow = Database['public']['Tables']['contratos']['Row']
type ContratoProdutoRow = Database['public']['Tables']['contrato_produtos']['Row']

function contratoRowBase(overrides: Partial<ContratoRow> = {}): ContratoRow {
  return {
    id: 'c1',
    tipo: 'Contrato',
    status: 'Ativo',
    fornecedor_nome: 'FORNECEDOR TESTE LTDA',
    fornecedor_cnpj: '12.345.678/0001-90',
    contato_nome: null,
    contato_email: null,
    contato_whatsapp: null,
    frete_tipo: null,
    prazo_medio_dias: null,
    origem_embarque: null,
    tolerancia_atraso_dias: null,
    horario_cutoff: null,
    gatilho_desconto: null,
    reajuste_regra: null,
    vigencia_inicio: null,
    vigencia_fim: null,
    aviso_renovacao_dias: null,
    renovacao_automatica: null,
    hospital_id: 'huv',
    classificacao: null,
    observacoes: null,
    deleted_at: null,
    created_at: null,
    owner_id: null,
    updated_at: null,
    ...overrides,
  }
}

function contratoProdutoRowBase(overrides: Partial<ContratoProdutoRow> = {}): ContratoProdutoRow {
  return {
    id: 'p1',
    contrato_id: 'c1',
    sku: null,
    descricao: 'SERINGA DESCARTAVEL 10ML',
    cod_soulmv: null,
    preco_unitario: 1.5,
    unidade: null,
    moq: null,
    capacidade_fornecimento: null,
    capacidade_periodo: null,
    meio_pagamento: null,
    deleted_at: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

describe('toContrato', () => {
  it('mapeia snake_case pra camelCase preservando os valores', () => {
    const c = toContrato(contratoRowBase())
    expect(c.id).toBe('c1')
    expect(c.fornecedorNome).toBe('FORNECEDOR TESTE LTDA')
    expect(c.hospitalId).toBe('huv')
  })

  it('usa 60 como padrão pra avisoRenovacaoDias nulo', () => {
    expect(toContrato(contratoRowBase({ aviso_renovacao_dias: null })).avisoRenovacaoDias).toBe(60)
  })

  it('usa false como padrão pra renovacaoAutomatica nulo', () => {
    expect(toContrato(contratoRowBase({ renovacao_automatica: null })).renovacaoAutomatica).toBe(false)
  })

  it('usa string vazia como padrão pros campos de texto nulos', () => {
    const c = toContrato(contratoRowBase({ contato_nome: null, observacoes: null }))
    expect(c.contatoNome).toBe('')
    expect(c.observacoes).toBe('')
  })
})

describe('toContratoProduto', () => {
  it('mapeia snake_case pra camelCase preservando os valores', () => {
    const p = toContratoProduto(contratoProdutoRowBase())
    expect(p.id).toBe('p1')
    expect(p.contratoId).toBe('c1')
    expect(p.descricao).toBe('SERINGA DESCARTAVEL 10ML')
  })

  it('usa "UNIDADE" como padrão pra unidade nula', () => {
    expect(toContratoProduto(contratoProdutoRowBase({ unidade: null })).unidade).toBe('UNIDADE')
  })

  it('usa "mes" como padrão pra capacidadePeriodo nula', () => {
    expect(toContratoProduto(contratoProdutoRowBase({ capacidade_periodo: null })).capacidadePeriodo).toBe('mes')
  })

  it('usa 0 como padrão pra precoUnitario nulo', () => {
    // @ts-expect-error preco_unitario é NOT NULL no schema, mas o mapeamento é defensivo
    expect(toContratoProduto(contratoProdutoRowBase({ preco_unitario: null })).precoUnitario).toBe(0)
  })
})
