-- Reconstrução — ver supabase/migrations/README.md.
-- CLAUDE.md (backlog item 23) descreve só o resultado ("Adicionar
-- respondido_em timestamptz em hist_oc"), não o SQL exato rodado — esta é a
-- forma equivalente mais direta.
--
-- Objetivo: registrar quando uma cobrança foi respondida, pra alimentar o
-- indicador de responsividade/tempo de resposta do fornecedor (Fase 2 da
-- Evolução de OCs) e a ação "✓ Marcar como respondida" na Central de
-- Pendências.
-- Impacto: nenhum em dado existente — coluna nova, nullable.
-- Risco: nenhum.
-- Rollback: ALTER TABLE hist_oc DROP COLUMN IF EXISTS respondido_em;
-- Backfill necessário: não (histórico anterior à feature fica null, correto
-- — não tem como saber retroativamente quando uma cobrança antiga foi
-- respondida).

ALTER TABLE hist_oc ADD COLUMN IF NOT EXISTS respondido_em timestamptz;
