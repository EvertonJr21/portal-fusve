-- NOVA — ainda NÃO aplicada em produção. Everton precisa rodar no SQL Editor.
--
-- Objetivo: Fase 1 da migração de datas texto→date (CLAUDE_ENGINEERING.md,
-- seções 8-9) — `ocs.data_solic`/`previsao_forn`/`previsao_forn2`/
-- `data_entrega_real`/`ultima_movimentacao` são hoje `text` em DD/MM/AAAA.
-- Esta migration só ADICIONA colunas `date` irmãs e faz o backfill — não
-- remove nem altera as colunas texto originais, e a aplicação continua
-- lendo só as colunas texto até a Fase 2 (troca de código) ser feita,
-- depois de confirmado que o backfill bateu 100%.
--
-- Impacto: nenhum — só coluna nova + UPDATE aditivo. Nenhum comportamento
-- de app muda nesta etapa.
-- Risco: baixo. O `WHERE ... ~ '^\d{2}/\d{2}/\d{4}$'` só converte texto que
-- já bate o formato esperado — linha com texto vazio, nulo, ou fora do
-- padrão fica com a coluna nova NULL em vez de inventar uma data (regra 66
-- do doc de engenharia: NULL é melhor que dado falso).
-- Rollback:
-- ALTER TABLE ocs DROP COLUMN IF EXISTS data_solic_date;
-- ALTER TABLE ocs DROP COLUMN IF EXISTS previsao_forn_date;
-- ALTER TABLE ocs DROP COLUMN IF EXISTS previsao_forn2_date;
-- ALTER TABLE ocs DROP COLUMN IF EXISTS data_entrega_real_date;
-- ALTER TABLE ocs DROP COLUMN IF EXISTS ultima_movimentacao_date;
-- Backfill necessário: sim, feito dentro desta própria migration.

ALTER TABLE ocs ADD COLUMN IF NOT EXISTS data_solic_date         date;
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS previsao_forn_date      date;
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS previsao_forn2_date     date;
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS data_entrega_real_date  date;
ALTER TABLE ocs ADD COLUMN IF NOT EXISTS ultima_movimentacao_date date;

UPDATE ocs SET data_solic_date = to_date(data_solic, 'DD/MM/YYYY')
  WHERE data_solic ~ '^\d{2}/\d{2}/\d{4}$' AND data_solic_date IS NULL;

UPDATE ocs SET previsao_forn_date = to_date(previsao_forn, 'DD/MM/YYYY')
  WHERE previsao_forn ~ '^\d{2}/\d{2}/\d{4}$' AND previsao_forn_date IS NULL;

UPDATE ocs SET previsao_forn2_date = to_date(previsao_forn2, 'DD/MM/YYYY')
  WHERE previsao_forn2 ~ '^\d{2}/\d{2}/\d{4}$' AND previsao_forn2_date IS NULL;

UPDATE ocs SET data_entrega_real_date = to_date(data_entrega_real, 'DD/MM/YYYY')
  WHERE data_entrega_real ~ '^\d{2}/\d{2}/\d{4}$' AND data_entrega_real_date IS NULL;

UPDATE ocs SET ultima_movimentacao_date = to_date(ultima_movimentacao, 'DD/MM/YYYY')
  WHERE ultima_movimentacao ~ '^\d{2}/\d{2}/\d{4}$' AND ultima_movimentacao_date IS NULL;

-- ── Verificação obrigatória (rodar manualmente, não é parte da migration) ──
-- Cada uma deve retornar 0 linhas — texto bem formado que não converteu:
--
-- SELECT id, data_solic FROM ocs
--   WHERE data_solic ~ '^\d{2}/\d{2}/\d{4}$' AND data_solic_date IS NULL;
-- SELECT id, previsao_forn FROM ocs
--   WHERE previsao_forn ~ '^\d{2}/\d{2}/\d{4}$' AND previsao_forn_date IS NULL;
-- SELECT id, previsao_forn2 FROM ocs
--   WHERE previsao_forn2 ~ '^\d{2}/\d{2}/\d{4}$' AND previsao_forn2_date IS NULL;
-- SELECT id, data_entrega_real FROM ocs
--   WHERE data_entrega_real ~ '^\d{2}/\d{2}/\d{4}$' AND data_entrega_real_date IS NULL;
-- SELECT id, ultima_movimentacao FROM ocs
--   WHERE ultima_movimentacao ~ '^\d{2}/\d{2}/\d{4}$' AND ultima_movimentacao_date IS NULL;
--
-- E o inverso — quantas linhas tinham texto só fora do padrão DD/MM/AAAA
-- (não é erro, é dado real que precisa de atenção manual antes da Fase 2):
--
-- SELECT id, data_solic FROM ocs
--   WHERE data_solic IS NOT NULL AND data_solic !~ '^\d{2}/\d{2}/\d{4}$';
