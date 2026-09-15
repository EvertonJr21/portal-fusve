-- Cópia exata do SQL documentado em CLAUDE.md, seção "Tabela marcas_sugeridas".
-- Já aplicado em produção em 01/09/2026.
--
-- Objetivo: tirar as recomendações de marca por categoria de
-- src/data/marcasSugeridas.json (estático, exigia deploy pra mudar) e trazer
-- pra uma tabela editável em /pareceres/marcas-sugeridas.
-- Impacto: nenhum em dado existente — tabela nova. Seed feito à parte por
-- `npm run migrate:marcas-sugeridas` (idempotente, upsert por cat).
-- Risco: nenhum.
-- Rollback: DROP TABLE IF EXISTS marcas_sugeridas;
-- Backfill necessário: sim, via scripts/migrate-marcas-sugeridas.ts (não faz
-- parte desta migration SQL).

CREATE TABLE IF NOT EXISTS marcas_sugeridas (
  cat        text PRIMARY KEY,
  marcas     text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE marcas_sugeridas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_marcas_sugeridas" ON marcas_sugeridas
  FOR ALL USING (auth.role() = 'authenticated');
