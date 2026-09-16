-- NOVA — ainda NÃO aplicada em produção. Everton precisa rodar no SQL Editor.
--
-- Objetivo: Passo 6 (final) da migração de datas texto→date (CLAUDE_ENGINEERING.md
-- seção 9, CLAUDE.md "Migração de Datas Texto → Date") — remove as 7 colunas de
-- texto legadas agora que:
--   1. Fase 1 (202609160001/0002/0003) já rodou e confirmou 0 discrepâncias
--      no backfill das colunas `*_date` nativas.
--   2. Fase 2 (código de aplicação) já está em produção — `ocRepository.ts`,
--      `solRepository.ts` e `parecerRepository.ts` não leem nem escrevem mais
--      as colunas texto, só as `*_date`.
--
-- IMPORTANTE — ORDEM DE EXECUÇÃO: só rode esta migration depois de confirmar
-- que o deploy do Vercel com o código novo (o commit que acompanha este
-- arquivo) já está no ar. Rodar antes disso quebraria a versão antiga do
-- app, que ainda tentaria ler/escrever as colunas texto.
--
-- Verificação de segurança recomendada (rodar ANTES do DROP, opcional mas
-- recomendado): confirma que nenhuma linha real ficou só com o texto fora do
-- padrão DD/MM/AAAA (que nunca foi convertida pro `_date` na Fase 1) — se
-- alguma dessas queries retornar linhas, o dado daquela coluna será perdido
-- ao rodar o DROP (a coluna `_date` continua NULL pra essas linhas). Eram
-- 0 linhas quando checado antes da Fase 2 — mas confirme de novo aqui,
-- porque a base pode ter mudado desde então:
--
-- SELECT id, data_solic FROM ocs
--   WHERE data_solic IS NOT NULL AND data_solic <> '' AND data_solic_date IS NULL;
-- SELECT id, previsao_forn FROM ocs
--   WHERE previsao_forn IS NOT NULL AND previsao_forn <> '' AND previsao_forn_date IS NULL;
-- SELECT id, previsao_forn2 FROM ocs
--   WHERE previsao_forn2 IS NOT NULL AND previsao_forn2 <> '' AND previsao_forn2_date IS NULL;
-- SELECT id, data_entrega_real FROM ocs
--   WHERE data_entrega_real IS NOT NULL AND data_entrega_real <> '' AND data_entrega_real_date IS NULL;
-- SELECT id, ultima_movimentacao FROM ocs
--   WHERE ultima_movimentacao IS NOT NULL AND ultima_movimentacao <> '' AND ultima_movimentacao_date IS NULL;
-- SELECT id, data FROM sols
--   WHERE data IS NOT NULL AND data <> '' AND data_date IS NULL;
-- SELECT cod, data_parecer FROM pareceres
--   WHERE data_parecer IS NOT NULL AND data_parecer <> '' AND data_parecer_date IS NULL;
--
-- Se qualquer uma retornar linhas: NÃO rode o DROP ainda — me avise com os
-- IDs, corrijo o texto manualmente (ex: `UPDATE ... SET xxx_date = ...`) pra
-- não perder o dado antes de remover a coluna texto.
--
-- Impacto: destrutivo e IRREVERSÍVEL — remove as colunas de texto. Os dados
-- já estão preservados nas colunas `*_date` (é a mesma informação, formato
-- nativo). Nenhum código de aplicação lê essas colunas mais (ver Fase 2).
-- Risco: baixo, DADO que a verificação acima retornou 0 linhas e o deploy
-- novo já está no ar.
-- Rollback: não há — colunas removidas não voltam. Se precisar recriar por
-- algum motivo, dá pra reconstruir o texto a partir da coluna `_date` com
-- `to_char(coluna_date, 'DD/MM/YYYY')`, mas a estrutura não seria idêntica
-- (perde valores fora do padrão que porventura existissem, ver acima).
-- Backfill necessário: não, é uma remoção.

ALTER TABLE ocs DROP COLUMN IF EXISTS data_solic;
ALTER TABLE ocs DROP COLUMN IF EXISTS previsao_forn;
ALTER TABLE ocs DROP COLUMN IF EXISTS previsao_forn2;
ALTER TABLE ocs DROP COLUMN IF EXISTS data_entrega_real;
ALTER TABLE ocs DROP COLUMN IF EXISTS ultima_movimentacao;

ALTER TABLE sols DROP COLUMN IF EXISTS data;

ALTER TABLE pareceres DROP COLUMN IF EXISTS data_parecer;

-- ── Verificação pós-DROP (rodar manualmente) ────────────────────────────
-- Confirma que as colunas sumiram e as `_date` continuam com dado:
--
-- SELECT count(*) FILTER (WHERE data_solic_date IS NOT NULL) AS com_data,
--        count(*) AS total
-- FROM ocs;
--
-- SELECT count(*) FILTER (WHERE data_date IS NOT NULL) AS com_data,
--        count(*) AS total
-- FROM sols;
--
-- SELECT count(*) FILTER (WHERE data_parecer_date IS NOT NULL) AS com_data,
--        count(*) AS total
-- FROM pareceres;
