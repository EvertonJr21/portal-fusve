-- Data de entrada confirmada pelo MV + origem da data de entrega (item 79 do CLAUDE.md).
--
-- Contexto: as métricas de entrega (OTIF, lead time) dependiam de
-- `data_entrega_real_date`, que até aqui vinha quase sempre de uma
-- aproximação — o dia em que a importação do relatório de OCs viu a OC como
-- "Atendida" (item 34). O relatório "Acompanhamento de Compras" do SoulMV
-- traz a data de entrada real (Dt. Entrada) e o número da entrada de cada OC,
-- então a data deixa de ser estimada quando esse relatório é importado.
--
-- Colunas novas, todas aditivas:
--   data_entrega_origem  'mv' (Dt. Entrada do Acompanhamento), 'manual'
--                        (digitada no Histórico da OC) ou 'estimada' (dia da
--                        importação em que a OC apareceu Atendida). NULL =
--                        data anterior a esta migration, origem desconhecida
--                        (as métricas tratam como estimada).
--   entrada_mv           número(s) da entrada no MV, separados por vírgula.
--   qtd_entradas         quantas entradas o MV registrou pra OC (0 = nenhuma
--                        conhecida). Mais de 1 = entrega fracionada, que
--                        reprova o "In Full" do OTIF.
--
-- Nenhum dado existente muda. Idempotente.

alter table public.ocs add column if not exists data_entrega_origem text;
alter table public.ocs add column if not exists entrada_mv text not null default '';
alter table public.ocs add column if not exists qtd_entradas integer not null default 0;

alter table public.ocs drop constraint if exists ocs_data_entrega_origem_check;
alter table public.ocs add constraint ocs_data_entrega_origem_check
  check (data_entrega_origem is null or data_entrega_origem in ('mv', 'manual', 'estimada'));

alter table public.ocs drop constraint if exists ocs_qtd_entradas_check;
alter table public.ocs add constraint ocs_qtd_entradas_check check (qtd_entradas >= 0);

-- Verificação (rodar depois): deve voltar 3 linhas.
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'ocs'
--      and column_name in ('data_entrega_origem', 'entrada_mv', 'qtd_entradas');
