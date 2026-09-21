-- NOVA — ainda NÃO aplicada em produção. Everton precisa rodar no SQL Editor.
--
-- Objetivo: pedido do Everton (21/09/2026) — o parecer hoje só suporta UM PDF
-- pra todo o produto, mas na prática cada marca proibida/restrita costuma ter
-- sua própria justificativa em PDF (ex: parecer do Zelara ≠ parecer do
-- Polymed, mesmo produto, marcas diferentes barradas por motivos diferentes).
-- Cria `parecer_anexos`: N PDFs por parecer, cada um explicitamente vinculado
-- a uma marca + categoria específica — não um anexo solto do parecer.
--
-- Aditivo, mesmo espírito das migrações anteriores: não mexe em
-- `pareceres.pdf_path`/`pdf_data_url` (o PDF único "geral" antigo continua
-- funcionando exatamente como antes, sem migração de dado nenhuma — os dois
-- mecanismos coexistem). Reaproveita o bucket `pareceres-pdfs` já existente
-- (202609160005) — políticas de Storage são por bucket, não por caminho
-- dentro dele, então não precisa de migration de Storage nova.
--
-- Impacto: nenhum em dado existente — tabela nova, nenhuma coluna de
-- `pareceres` tocada.
-- Risco: baixo.
-- Rollback: DROP TABLE IF EXISTS parecer_anexos;
-- Backfill necessário: não.

CREATE TABLE IF NOT EXISTS parecer_anexos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parecer_cod   text NOT NULL REFERENCES pareceres(cod) ON DELETE CASCADE,
  categoria     text NOT NULL CHECK (categoria IN ('padrao', 'permitidas', 'restritas', 'proibidas')),
  marca         text NOT NULL,
  pdf_path      text NOT NULL,
  nome_arquivo  text NOT NULL,
  deleted_at    timestamptz DEFAULT NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parecer_anexos_cod ON parecer_anexos(parecer_cod);

ALTER TABLE parecer_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_parecer_anexos" ON parecer_anexos
  FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ── Verificação (rodar manualmente) ─────────────────────────────────────
-- SELECT * FROM parecer_anexos LIMIT 5;
-- SELECT count(*) FROM parecer_anexos;  -- deve dar 0 logo após a migration
