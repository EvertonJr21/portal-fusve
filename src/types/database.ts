/**
 * Gerado por `mcp__supabase__generate_typescript_types` (equivalente real a
 * `supabase gen types typescript`) em 17/09/2026 — primeira vez que esse
 * comando roda de verdade contra o schema de produção (a CLI exigia
 * `supabase login` interativo, indisponível neste ambiente; o MCP não tem
 * essa limitação). Substitui a versão escrita manualmente em 30/08/2026 a
 * partir de `information_schema.columns` (ver item 2 do backlog).
 *
 * Achado ao comparar com a versão manual: `ocs.solicitacao_id` não tem FK
 * de verdade pra `sols.id` no banco (só era documentado como se tivesse) —
 * o vínculo OC↔Solicitação é mantido pela aplicação, não pelo Postgres.
 *
 * Referência/conferência — os hooks (`src/hooks/use*.ts`) continuam
 * mapeando snake_case → camelCase manualmente pros tipos de domínio em
 * `src/types/index.ts`; regenerar este arquivo sempre que o schema mudar.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contrato_produtos: {
        Row: {
          capacidade_fornecimento: number | null
          capacidade_periodo: string | null
          cod_soulmv: string | null
          contrato_id: string
          created_at: string | null
          deleted_at: string | null
          descricao: string
          id: string
          meio_pagamento: string | null
          moq: number | null
          preco_unitario: number
          sku: string | null
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          capacidade_fornecimento?: number | null
          capacidade_periodo?: string | null
          cod_soulmv?: string | null
          contrato_id: string
          created_at?: string | null
          deleted_at?: string | null
          descricao: string
          id?: string
          meio_pagamento?: string | null
          moq?: number | null
          preco_unitario?: number
          sku?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          capacidade_fornecimento?: number | null
          capacidade_periodo?: string | null
          cod_soulmv?: string | null
          contrato_id?: string
          created_at?: string | null
          deleted_at?: string | null
          descricao?: string
          id?: string
          meio_pagamento?: string | null
          moq?: number | null
          preco_unitario?: number
          sku?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_produtos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          aviso_renovacao_dias: number | null
          classificacao: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_whatsapp: string | null
          created_at: string | null
          deleted_at: string | null
          fornecedor_cnpj: string | null
          fornecedor_nome: string
          frete_tipo: string | null
          gatilho_desconto: string | null
          horario_cutoff: string | null
          hospital_id: string
          id: string
          observacoes: string | null
          origem_embarque: string | null
          prazo_medio_dias: number | null
          reajuste_regra: string | null
          renovacao_automatica: boolean | null
          status: string
          tipo: string
          tolerancia_atraso_dias: number | null
          updated_at: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          aviso_renovacao_dias?: number | null
          classificacao?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_whatsapp?: string | null
          created_at?: string | null
          deleted_at?: string | null
          fornecedor_cnpj?: string | null
          fornecedor_nome: string
          frete_tipo?: string | null
          gatilho_desconto?: string | null
          horario_cutoff?: string | null
          hospital_id?: string
          id?: string
          observacoes?: string | null
          origem_embarque?: string | null
          prazo_medio_dias?: number | null
          reajuste_regra?: string | null
          renovacao_automatica?: boolean | null
          status?: string
          tipo?: string
          tolerancia_atraso_dias?: number | null
          updated_at?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          aviso_renovacao_dias?: number | null
          classificacao?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_whatsapp?: string | null
          created_at?: string | null
          deleted_at?: string | null
          fornecedor_cnpj?: string | null
          fornecedor_nome?: string
          frete_tipo?: string | null
          gatilho_desconto?: string | null
          horario_cutoff?: string | null
          hospital_id?: string
          id?: string
          observacoes?: string | null
          origem_embarque?: string | null
          prazo_medio_dias?: number | null
          reajuste_regra?: string | null
          renovacao_automatica?: boolean | null
          status?: string
          tipo?: string
          tolerancia_atraso_dias?: number | null
          updated_at?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      forns: {
        Row: {
          cnpj: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: number
          nome: string
          updated_at: string | null
          wpp: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id: number
          nome: string
          updated_at?: string | null
          wpp?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: number
          nome?: string
          updated_at?: string | null
          wpp?: string | null
        }
        Relationships: []
      }
      hist_oc: {
        Row: {
          canal: string | null
          created_at: string | null
          hid: number
          oc_id: number | null
          respondido_em: string | null
          resposta: string | null
          tipo: string | null
          ts: number | null
        }
        Insert: {
          canal?: string | null
          created_at?: string | null
          hid?: number
          oc_id?: number | null
          respondido_em?: string | null
          resposta?: string | null
          tipo?: string | null
          ts?: number | null
        }
        Update: {
          canal?: string | null
          created_at?: string | null
          hid?: number
          oc_id?: number | null
          respondido_em?: string | null
          resposta?: string | null
          tipo?: string | null
          ts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hist_oc_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ocs"
            referencedColumns: ["id"]
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
      ocs: {
        Row: {
          cobrado: boolean | null
          created_at: string | null
          data_entrega_real_date: string | null
          data_solic_date: string | null
          deleted_at: string | null
          dias_atraso: number | null
          estoque: string | null
          fornecedor_id: number | null
          fornecedor_nome: string | null
          hospital_id: string | null
          id: number
          motivo_atraso: string | null
          previsao_descumprida: boolean | null
          previsao_forn_date: string | null
          previsao_forn2_date: string | null
          proxima_acao: string | null
          sit: string | null
          solicitacao_id: number | null
          ultima_movimentacao_date: string | null
          updated_at: string | null
        }
        Insert: {
          cobrado?: boolean | null
          created_at?: string | null
          data_entrega_real_date?: string | null
          data_solic_date?: string | null
          deleted_at?: string | null
          dias_atraso?: number | null
          estoque?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string | null
          hospital_id?: string | null
          id: number
          motivo_atraso?: string | null
          previsao_descumprida?: boolean | null
          previsao_forn_date?: string | null
          previsao_forn2_date?: string | null
          proxima_acao?: string | null
          sit?: string | null
          solicitacao_id?: number | null
          ultima_movimentacao_date?: string | null
          updated_at?: string | null
        }
        Update: {
          cobrado?: boolean | null
          created_at?: string | null
          data_entrega_real_date?: string | null
          data_solic_date?: string | null
          deleted_at?: string | null
          dias_atraso?: number | null
          estoque?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string | null
          hospital_id?: string | null
          id?: number
          motivo_atraso?: string | null
          previsao_descumprida?: boolean | null
          previsao_forn_date?: string | null
          previsao_forn2_date?: string | null
          proxima_acao?: string | null
          sit?: string | null
          solicitacao_id?: number | null
          ultima_movimentacao_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      opmes: {
        Row: {
          created_at: string | null
          data_cirurgia: string
          deleted_at: string | null
          fornecedor_id: number | null
          hospital_id: string
          id: string
          observacao: string | null
          paciente: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_cirurgia: string
          deleted_at?: string | null
          fornecedor_id?: number | null
          hospital_id: string
          id?: string
          observacao?: string | null
          paciente: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_cirurgia?: string
          deleted_at?: string | null
          fornecedor_id?: number | null
          hospital_id?: string
          id?: string
          observacao?: string | null
          paciente?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opmes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "forns"
            referencedColumns: ["id"]
          },
        ]
      }
      parecer_anexos: {
        Row: {
          categoria: string
          created_at: string | null
          deleted_at: string | null
          id: string
          marca: string
          nome_arquivo: string
          parecer_cod: string
          pdf_path: string
          updated_at: string | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          marca: string
          nome_arquivo: string
          parecer_cod: string
          pdf_path: string
          updated_at?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          marca?: string
          nome_arquivo?: string
          parecer_cod?: string
          pdf_path?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parecer_anexos_parecer_cod_fkey"
            columns: ["parecer_cod"]
            isOneToOne: false
            referencedRelation: "pareceres"
            referencedColumns: ["cod"]
          },
        ]
      }
      pareceres: {
        Row: {
          cat: string
          cod: string
          created_at: string | null
          data_parecer_date: string | null
          nome: string
          observacao: string
          padrao: string[]
          parecer: string
          pdf_data_url: string | null
          pdf_path: string | null
          permitidas: string[]
          proibidas: string[]
          responsavel: string
          restritas: string[]
          updated_at: string | null
        }
        Insert: {
          cat?: string
          cod: string
          created_at?: string | null
          data_parecer_date?: string | null
          nome?: string
          observacao?: string
          padrao?: string[]
          parecer?: string
          pdf_data_url?: string | null
          pdf_path?: string | null
          permitidas?: string[]
          proibidas?: string[]
          responsavel?: string
          restritas?: string[]
          updated_at?: string | null
        }
        Update: {
          cat?: string
          cod?: string
          created_at?: string | null
          data_parecer_date?: string | null
          nome?: string
          observacao?: string
          padrao?: string[]
          parecer?: string
          pdf_data_url?: string | null
          pdf_path?: string | null
          permitidas?: string[]
          proibidas?: string[]
          responsavel?: string
          restritas?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      sols: {
        Row: {
          created_at: string | null
          data_date: string | null
          deleted_at: string | null
          hospital_id: string | null
          id: number
          motivo: string | null
          produto: string | null
          qtd: number | null
          sit: string | null
          solicitante: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_date?: string | null
          deleted_at?: string | null
          hospital_id?: string | null
          id: number
          motivo?: string | null
          produto?: string | null
          qtd?: number | null
          sit?: string | null
          solicitante?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_date?: string | null
          deleted_at?: string | null
          hospital_id?: string | null
          id?: number
          motivo?: string | null
          produto?: string | null
          qtd?: number | null
          sit?: string | null
          solicitante?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
