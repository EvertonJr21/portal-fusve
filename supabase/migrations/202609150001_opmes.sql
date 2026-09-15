-- Cópia exata do SQL documentado em CLAUDE.md, seção "Tabela opmes".
-- Já aplicado em produção em 15/09/2026 (Everton confirmou nesta sessão).
--
-- Objetivo: novo módulo OPME — calendário de cirurgias com controle de
-- entrega (paciente, data, fornecedor, status). Ver CLAUDE.md, seção
-- "Módulo OPME", pro motivo de não ter campo de material/produto.
-- Impacto: nenhum em dado existente — tabela nova.
-- Risco: nenhum.
-- Rollback: DROP TABLE IF EXISTS opmes;
-- Backfill necessário: não.

CREATE TABLE IF NOT EXISTS opmes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente       text NOT NULL,
  data_cirurgia  date NOT NULL,
  fornecedor_id  integer REFERENCES forns(id),
  hospital_id    text NOT NULL,
  status         text NOT NULL DEFAULT 'pendente',
  observacao     text DEFAULT '',
  deleted_at     timestamptz DEFAULT NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opmes_hospital ON opmes(hospital_id);
CREATE INDEX IF NOT EXISTS idx_opmes_data     ON opmes(data_cirurgia);
ALTER TABLE opmes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_opmes" ON opmes
  FOR ALL USING (auth.role() = 'authenticated');
