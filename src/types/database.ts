/**
 * Tipos gerados a partir do schema real do Supabase de produção
 * (urruseycrvfajnnbupyd), consultado via `information_schema.columns`
 * em 30/08/2026 — a CLI (`supabase gen types`) exige login interativo,
 * indisponível neste ambiente, então o schema foi extraído por SQL direto
 * e formatado no mesmo shape que `supabase gen types typescript` produz.
 *
 * Referência/conferência — os hooks (`src/hooks/use*.ts`) continuam
 * mapeando snake_case → camelCase manualmente pros tipos de domínio em
 * `src/types/index.ts`; comparar os dois quando o schema mudar.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      contrato_produtos: {
        Row: {
          id: string
          contrato_id: string
          sku: string | null
          descricao: string
          cod_soulmv: string | null
          preco_unitario: number
          unidade: string | null
          moq: number | null
          capacidade_fornecimento: number | null
          capacidade_periodo: string | null
          meio_pagamento: string | null
          deleted_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          contrato_id: string
          sku?: string | null
          descricao: string
          cod_soulmv?: string | null
          preco_unitario?: number
          unidade?: string | null
          moq?: number | null
          capacidade_fornecimento?: number | null
          capacidade_periodo?: string | null
          meio_pagamento?: string | null
          deleted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          contrato_id?: string
          sku?: string | null
          descricao?: string
          cod_soulmv?: string | null
          preco_unitario?: number
          unidade?: string | null
          moq?: number | null
          capacidade_fornecimento?: number | null
          capacidade_periodo?: string | null
          meio_pagamento?: string | null
          deleted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'contrato_produtos_contrato_id_fkey'
            columns: ['contrato_id']
            referencedRelation: 'contratos'
            referencedColumns: ['id']
          },
        ]
      }
      contratos: {
        Row: {
          id: string
          tipo: string
          status: string
          fornecedor_nome: string
          fornecedor_cnpj: string | null
          contato_nome: string | null
          contato_email: string | null
          contato_whatsapp: string | null
          frete_tipo: string | null
          prazo_medio_dias: number | null
          origem_embarque: string | null
          tolerancia_atraso_dias: number | null
          horario_cutoff: string | null
          gatilho_desconto: string | null
          reajuste_regra: string | null
          vigencia_inicio: string | null
          vigencia_fim: string | null
          aviso_renovacao_dias: number | null
          renovacao_automatica: boolean | null
          hospital_id: string
          classificacao: string | null
          observacoes: string | null
          deleted_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tipo?: string
          status?: string
          fornecedor_nome: string
          fornecedor_cnpj?: string | null
          contato_nome?: string | null
          contato_email?: string | null
          contato_whatsapp?: string | null
          frete_tipo?: string | null
          prazo_medio_dias?: number | null
          origem_embarque?: string | null
          tolerancia_atraso_dias?: number | null
          horario_cutoff?: string | null
          gatilho_desconto?: string | null
          reajuste_regra?: string | null
          vigencia_inicio?: string | null
          vigencia_fim?: string | null
          aviso_renovacao_dias?: number | null
          renovacao_automatica?: boolean | null
          hospital_id?: string
          classificacao?: string | null
          observacoes?: string | null
          deleted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tipo?: string
          status?: string
          fornecedor_nome?: string
          fornecedor_cnpj?: string | null
          contato_nome?: string | null
          contato_email?: string | null
          contato_whatsapp?: string | null
          frete_tipo?: string | null
          prazo_medio_dias?: number | null
          origem_embarque?: string | null
          tolerancia_atraso_dias?: number | null
          horario_cutoff?: string | null
          gatilho_desconto?: string | null
          reajuste_regra?: string | null
          vigencia_inicio?: string | null
          vigencia_fim?: string | null
          aviso_renovacao_dias?: number | null
          renovacao_automatica?: boolean | null
          hospital_id?: string
          classificacao?: string | null
          observacoes?: string | null
          deleted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      forns: {
        Row: {
          id: number
          nome: string
          email: string | null
          wpp: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id: number
          nome: string
          email?: string | null
          wpp?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: number
          nome?: string
          email?: string | null
          wpp?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      hist_oc: {
        Row: {
          hid: number
          oc_id: number | null
          ts: number | null
          canal: string | null
          resposta: string | null
          tipo: string | null
          created_at: string | null
          respondido_em: string | null
        }
        Insert: {
          hid?: number
          oc_id?: number | null
          ts?: number | null
          canal?: string | null
          resposta?: string | null
          tipo?: string | null
          created_at?: string | null
          respondido_em?: string | null
        }
        Update: {
          hid?: number
          oc_id?: number | null
          ts?: number | null
          canal?: string | null
          resposta?: string | null
          tipo?: string | null
          created_at?: string | null
          respondido_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'hist_oc_oc_id_fkey'
            columns: ['oc_id']
            referencedRelation: 'ocs'
            referencedColumns: ['id']
          },
        ]
      }
      ocs: {
        Row: {
          id: number
          data_solic: string | null
          fornecedor_nome: string | null
          fornecedor_id: number | null
          sit: string | null
          estoque: string | null
          solicitacao_id: number | null
          cobrado: boolean | null
          previsao_forn: string | null
          data_entrega_real: string | null
          dias_atraso: number | null
          created_at: string | null
          updated_at: string | null
          hospital_id: string | null
          proxima_acao: string | null
          motivo_atraso: string | null
          ultima_movimentacao: string | null
          previsao_descumprida: boolean | null
          deleted_at: string | null
          previsao_forn2: string | null
        }
        Insert: {
          id: number
          data_solic?: string | null
          fornecedor_nome?: string | null
          fornecedor_id?: number | null
          sit?: string | null
          estoque?: string | null
          solicitacao_id?: number | null
          cobrado?: boolean | null
          previsao_forn?: string | null
          data_entrega_real?: string | null
          dias_atraso?: number | null
          created_at?: string | null
          updated_at?: string | null
          hospital_id?: string | null
          proxima_acao?: string | null
          motivo_atraso?: string | null
          ultima_movimentacao?: string | null
          previsao_descumprida?: boolean | null
          deleted_at?: string | null
          previsao_forn2?: string | null
        }
        Update: {
          id?: number
          data_solic?: string | null
          fornecedor_nome?: string | null
          fornecedor_id?: number | null
          sit?: string | null
          estoque?: string | null
          solicitacao_id?: number | null
          cobrado?: boolean | null
          previsao_forn?: string | null
          data_entrega_real?: string | null
          dias_atraso?: number | null
          created_at?: string | null
          updated_at?: string | null
          hospital_id?: string | null
          proxima_acao?: string | null
          motivo_atraso?: string | null
          ultima_movimentacao?: string | null
          previsao_descumprida?: boolean | null
          deleted_at?: string | null
          previsao_forn2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ocs_solicitacao_id_fkey'
            columns: ['solicitacao_id']
            referencedRelation: 'sols'
            referencedColumns: ['id']
          },
        ]
      }
      marcas_sugeridas: {
        Row: {
          cat: string
          marcas: string[]
          updated_at: string | null
        }
        Insert: {
          cat: string
          marcas?: string[]
          updated_at?: string | null
        }
        Update: {
          cat?: string
          marcas?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      pareceres: {
        Row: {
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
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          cod: string
          nome?: string
          cat?: string
          padrao?: string[]
          permitidas?: string[]
          restritas?: string[]
          proibidas?: string[]
          observacao?: string
          responsavel?: string
          data_parecer?: string
          parecer?: string
          pdf_data_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          cod?: string
          nome?: string
          cat?: string
          padrao?: string[]
          permitidas?: string[]
          restritas?: string[]
          proibidas?: string[]
          observacao?: string
          responsavel?: string
          data_parecer?: string
          parecer?: string
          pdf_data_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sols: {
        Row: {
          id: number
          data: string | null
          produto: string | null
          solicitante: string | null
          qtd: number | null
          sit: string | null
          created_at: string | null
          updated_at: string | null
          hospital_id: string | null
          motivo: string | null
          deleted_at: string | null
        }
        Insert: {
          id: number
          data?: string | null
          produto?: string | null
          solicitante?: string | null
          qtd?: number | null
          sit?: string | null
          created_at?: string | null
          updated_at?: string | null
          hospital_id?: string | null
          motivo?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: number
          data?: string | null
          produto?: string | null
          solicitante?: string | null
          qtd?: number | null
          sit?: string | null
          created_at?: string | null
          updated_at?: string | null
          hospital_id?: string | null
          motivo?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
