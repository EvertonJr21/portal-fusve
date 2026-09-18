-- Objetivo: validar os 2 CHECK constraints de `opmes` criados como NOT VALID
--   em 202609150002_check_constraints.sql (hospital_id, status) — item 26 do
--   backlog deixou isso como "opcional, não confirmado se foi rodado".
-- Impacto: nenhum na aplicação. NOT VALID já bloqueia escritas novas que
--   violem a regra desde a criação; VALIDATE só confere o dado histórico.
-- Risco: nenhum — `opmes` está com 0 linhas em produção (tabela nova,
--   15/09/2026, ainda sem uso real), então a validação é instantânea.
-- Rollback: não se aplica (validar um CHECK não é reversível nem precisa ser
--   — só passa a reportar `convalidated = true`, não muda dado nenhum).
-- Backfill necessário: não.

alter table public.opmes validate constraint opmes_hospital_id_check;
alter table public.opmes validate constraint opmes_status_check;
