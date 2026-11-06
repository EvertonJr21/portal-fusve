-- 202611060005_titulo_contratos.sql
--
-- Título do contrato/acordo (item 84 do CLAUDE.md). Pedido do Everton: o mesmo
-- fornecedor pode ter vários acordos (ex.: Mais Life — um de Stent, outro de
-- Cateter Balão), e na Tabela Mestre só aparecia o nome do fornecedor.
--
-- Aditiva: coluna nova com default '', nenhum dado existente alterado.
-- Rollback: ALTER TABLE contratos DROP COLUMN IF EXISTS titulo;

alter table public.contratos add column if not exists titulo text not null default '';

-- Verificação:
-- select column_name, data_type, column_default from information_schema.columns
--  where table_name = 'contratos' and column_name = 'titulo';
