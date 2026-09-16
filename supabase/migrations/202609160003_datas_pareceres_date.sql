-- NOVA — ainda NÃO aplicada em produção. Everton precisa rodar no SQL Editor.
--
-- Objetivo: Fase 1 da migração de datas texto→date, tabela `pareceres`.
-- Mesmo padrão de 202609160001_datas_ocs_date.sql — só coluna nova +
-- backfill, aplicação continua lendo `data_parecer` (texto) até a Fase 2.
--
-- Impacto: nenhum.
-- Risco: baixo — mesmo raciocínio do arquivo de `ocs`. Único cuidado extra:
-- os 98 pareceres migrados do Firebase (item 4 do backlog) podem ter vindo
-- com `data_parecer` em formato diferente de DD/MM/AAAA — a verificação
-- abaixo cobre esse caso, não assume que todos vão converter.
-- Rollback: ALTER TABLE pareceres DROP COLUMN IF EXISTS data_parecer_date;
-- Backfill necessário: sim, feito dentro desta própria migration.

ALTER TABLE pareceres ADD COLUMN IF NOT EXISTS data_parecer_date date;

UPDATE pareceres SET data_parecer_date = to_date(data_parecer, 'DD/MM/YYYY')
  WHERE data_parecer ~ '^\d{2}/\d{2}/\d{4}$' AND data_parecer_date IS NULL;

-- ── Verificação obrigatória (rodar manualmente) ──────────────────────────
-- Deve retornar 0 linhas:
-- SELECT cod, data_parecer FROM pareceres
--   WHERE data_parecer ~ '^\d{2}/\d{2}/\d{4}$' AND data_parecer_date IS NULL;
--
-- Dado real fora do padrão (ex: herdado do Firebase em formato diferente),
-- pra revisar antes da Fase 2:
-- SELECT cod, data_parecer FROM pareceres
--   WHERE data_parecer IS NOT NULL AND data_parecer <> ''
--   AND data_parecer !~ '^\d{2}/\d{2}/\d{4}$';
