-- Zera a previsão do fornecedor (1ª e 2ª entrega) de todas as OCs.
--
-- Pedido do Everton (08/10/2026): reportou que OCs novas continuavam
-- entrando no sistema com a previsão já preenchida, apesar do item 34
-- (18/09/2026) já ter tratado isso pra OC recém-criada na importação.
--
-- Causa real (item 72 do CLAUDE.md): o item 34 só cobriu OC NOVA. Pra OC
-- JÁ EXISTENTE sem previsão, `Importar.tsx` continuava aceitando o valor do
-- relatório do SoulMV como "valor inicial" (decisão deliberada da época).
-- Como o Everton reimporta o mesmo relatório periodicamente, toda OC nova
-- (criada sem previsão, corretamente) acabava recebendo a previsão do
-- relatório de qualquer jeito 1 ciclo de importação depois — só atrasava o
-- preenchimento automático, não eliminava. Esse comportamento foi removido
-- do código no mesmo commit desta migration (`Importar.tsx`): previsão
-- agora é sempre manual, nunca vem de importação, nem pra OC nova nem pra
-- OC existente.
--
-- Esta migration limpa o estoque atual de previsões que já entraram por
-- esse caminho (não dá pra distinguir no banco quais vieram do relatório
-- vs. foram digitadas manualmente pelo Everton — não existe flag de origem
-- pra esse campo) — pedido explícito dele: "Consegue zerar as previsões
-- que estão ali hoje e deixar que eu preencha só manualmente."
--
-- Aditiva/corretiva, sem DROP de coluna — só limpa o conteúdo. Idempotente
-- (rodar de novo não tem efeito adicional depois da 1ª vez).
update ocs
set previsao_forn_date = null,
    previsao_forn2_date = null
where previsao_forn_date is not null
   or previsao_forn2_date is not null;
