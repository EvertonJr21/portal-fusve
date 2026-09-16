-- NOVA — ainda NÃO aplicada em produção. Everton precisa rodar no SQL Editor.
--
-- Objetivo: Fase 1 da migração de datas texto→date, tabela `sols`. Mesmo
-- padrão de 202609160001_datas_ocs_date.sql — só coluna nova + backfill,
-- aplicação continua lendo `data` (texto) até a Fase 2.
--
-- Impacto: nenhum.
-- Risco: baixo — mesmo raciocínio do arquivo de `ocs`.
-- Rollback: ALTER TABLE sols DROP COLUMN IF EXISTS data_date;
-- Backfill necessário: sim, feito dentro desta própria migration.

ALTER TABLE sols ADD COLUMN IF NOT EXISTS data_date date;

UPDATE sols SET data_date = to_date(data, 'DD/MM/YYYY')
  WHERE data ~ '^\d{2}/\d{2}/\d{4}$' AND data_date IS NULL;

-- ── Verificação obrigatória (rodar manualmente) ──────────────────────────
-- Deve retornar 0 linhas:
-- SELECT id, data FROM sols WHERE data ~ '^\d{2}/\d{2}/\d{4}$' AND data_date IS NULL;
--
-- Dado real fora do padrão, pra revisar antes da Fase 2 (não é erro da migration):
-- SELECT id, data FROM sols WHERE data IS NOT NULL AND data !~ '^\d{2}/\d{2}/\d{4}$';
