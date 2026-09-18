-- ARQUIVO HISTÓRICO — NÃO EXECUTAR.
--
-- Movido do CLAUDE.md em 16/09/2026 por causa da regra 42 do
-- CLAUDE_ENGINEERING.md ("SQL antigo não pode permanecer como instrução
-- ativa"): este bloco documentava o setup inicial do schema (29/08/2026,
-- antes de `supabase/migrations/` existir como fonte de verdade versionada,
-- ver `supabase/migrations/README.md`), mas continha SQL que hoje é
-- **obsoleto e perigoso se rodado de novo**:
--
--   - As policies de RLS abaixo (`anon_ocs`, `anon_sols`, etc., todas
--     `USING (true)`) liberavam acesso total ao role `anon`. Foram
--     substituídas por policies que exigem `auth.role() = 'authenticated'`
--     em 30/08/2026 (ver CLAUDE.md, backlog item 12, e
--     `supabase/migrations/202608300001_rls_autenticado.sql`). Rodar este
--     bloco de novo REABRIRIA o acesso anônimo.
--   - `pareceres.data_parecer` (text) foi removida em 16/09/2026 pela
--     migração de datas texto→date (ver CLAUDE.md, "Migração de Datas
--     Texto → Date", e `supabase/migrations/202609160004_remove_colunas_texto_datas.sql`).
--     A coluna atual é `data_parecer_date` (`date` nativo).
--
-- Preservado aqui só como registro histórico de como o schema começou —
-- consulte `supabase/migrations/` pra ver o estado real e a ordem em que o
-- schema evoluiu, e o CLAUDE.md (seção "BANCO DE DADOS") pra ver as tabelas
-- como elas são hoje.

-- ── OCs ──────────────────────────────────────────────────────────────
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS previsao_forn2    text;
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS deleted_at        timestamptz DEFAULT NULL;
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS created_at        timestamptz DEFAULT now();
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS updated_at        timestamptz DEFAULT now();

-- ── Solicitações ─────────────────────────────────────────────────────
ALTER TABLE sols ADD COLUMN IF NOT EXISTS deleted_at       timestamptz DEFAULT NULL;
ALTER TABLE sols ADD COLUMN IF NOT EXISTS created_at       timestamptz DEFAULT now();

-- ── Fornecedores ─────────────────────────────────────────────────────
ALTER TABLE forns ADD COLUMN IF NOT EXISTS deleted_at      timestamptz DEFAULT NULL;

-- ── Pareceres (nova tabela) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pareceres (
  cod           text PRIMARY KEY,
  nome          text NOT NULL DEFAULT '',
  cat           text NOT NULL DEFAULT '',
  padrao        text[] NOT NULL DEFAULT '{}',
  permitidas    text[] NOT NULL DEFAULT '{}',
  restritas     text[] NOT NULL DEFAULT '{}',
  proibidas     text[] NOT NULL DEFAULT '{}',
  observacao    text NOT NULL DEFAULT '',
  responsavel   text NOT NULL DEFAULT '',
  data_parecer  text NOT NULL DEFAULT '',
  parecer       text NOT NULL DEFAULT '',
  pdf_data_url  text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── Contratos (novo desenho — Fase 5, 2 tabelas) ────────────────────────
CREATE TABLE IF NOT EXISTS contratos (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                    text NOT NULL DEFAULT 'Contrato',
  status                  text NOT NULL DEFAULT 'Ativo',
  fornecedor_nome         text NOT NULL,
  fornecedor_cnpj         text DEFAULT '',
  contato_nome            text DEFAULT '',
  contato_email           text DEFAULT '',
  contato_whatsapp        text DEFAULT '',
  frete_tipo              text DEFAULT '',
  prazo_medio_dias        integer,
  origem_embarque         text DEFAULT '',
  tolerancia_atraso_dias  integer,
  horario_cutoff          text DEFAULT '',
  gatilho_desconto        text DEFAULT '',
  reajuste_regra          text DEFAULT '',
  vigencia_inicio         date,
  vigencia_fim            date,
  aviso_renovacao_dias    integer DEFAULT 60,
  renovacao_automatica    boolean DEFAULT false,
  hospital_id             text NOT NULL DEFAULT 'ambos',
  classificacao           text DEFAULT '',
  observacoes             text DEFAULT '',
  deleted_at              timestamptz DEFAULT NULL,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contrato_produtos (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id               uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  sku                       text DEFAULT '',
  descricao                 text NOT NULL,
  cod_soulmv                text DEFAULT '',
  preco_unitario            numeric(12,2) NOT NULL DEFAULT 0,
  unidade                   text DEFAULT 'UNIDADE',
  moq                       integer,
  capacidade_fornecimento   integer,
  capacidade_periodo        text DEFAULT 'mes',
  meio_pagamento            text DEFAULT '',
  deleted_at                timestamptz DEFAULT NULL,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- ── Índices ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ocs_hospital        ON ocs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ocs_deleted         ON ocs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sols_hospital       ON sols(hospital_id);
CREATE INDEX IF NOT EXISTS idx_contratos_hospital  ON contratos(hospital_id);
CREATE INDEX IF NOT EXISTS idx_contratos_vigencia  ON contratos(vigencia_fim);
CREATE INDEX IF NOT EXISTS idx_contrato_produtos_contrato ON contrato_produtos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_pareceres_cat       ON pareceres(cat);

-- ── RLS (⚠ OBSOLETO — NÃO RODAR — ver aviso no topo do arquivo) ────────
ALTER TABLE ocs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sols       ENABLE ROW LEVEL SECURITY;
ALTER TABLE forns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hist_oc    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pareceres        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_ocs"             ON ocs             FOR ALL USING (true);
CREATE POLICY "anon_sols"            ON sols            FOR ALL USING (true);
CREATE POLICY "anon_forns"           ON forns           FOR ALL USING (true);
CREATE POLICY "anon_hist_oc"         ON hist_oc         FOR ALL USING (true);
CREATE POLICY "anon_pareceres"       ON pareceres       FOR ALL USING (true);
CREATE POLICY "anon_contratos"       ON contratos       FOR ALL USING (true);
CREATE POLICY "anon_contrato_produtos" ON contrato_produtos FOR ALL USING (true);
