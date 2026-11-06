-- Requisito técnico de compra no parecer (item 78 do CLAUDE.md).
--
-- Pedido do Everton (06/11/2026): alguns produtos precisam de parecer só pra
-- registrar uma exigência de compra, sem nenhuma marca definida — ex.: o
-- DRENO DE SUCCAO TORACICO MEDIASTINAL/PLEURAL DR 34 SILICONE "só pode ser
-- comprado se for de silicone". Até aqui o formulário exigia ao menos uma marca,
-- e a exigência acabava escrita no campo livre de Observação (ou com uma marca
-- colocada só pra conseguir salvar).
--
-- Campo próprio, separado da Observação: o requisito é a regra que vale pra
-- qualquer marca; a observação continua sendo nota livre. Um parecer agora é
-- válido com ao menos uma marca OU um requisito técnico.
--
-- Aditiva e idempotente: nenhum dado existente muda. Parecer antigo que tenha
-- o requisito escrito na Observação é ajustado à mão pela tela (Base de
-- Pareceres → editar), já que não dá pra separar automaticamente o que é
-- requisito do que é observação.

alter table public.pareceres
  add column if not exists requisito_tecnico text not null default '';

-- Verificação (rodar depois): deve voltar 1 linha.
--   select column_name, data_type, column_default
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'pareceres' and column_name = 'requisito_tecnico';
