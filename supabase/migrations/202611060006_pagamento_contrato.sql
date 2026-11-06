-- 202611060006_pagamento_contrato.sql
--
-- Condição de pagamento passa a ser do contrato, não de cada produto (item 85
-- do CLAUDE.md). Pedido do Everton: pagamento por item não faz sentido, é uma
-- condição do contrato/acordo inteiro.
--
-- Aditiva: coluna nova em `contratos`. Backfill: contrato sem condição recebe o
-- pagamento mais usado entre os seus produtos (quando algum produto tinha). A
-- coluna antiga `contrato_produtos.meio_pagamento` fica como está (dado
-- histórico preservado), só deixa de aparecer na tela.
--
-- Rollback: ALTER TABLE contratos DROP COLUMN IF EXISTS condicao_pagamento;

alter table public.contratos add column if not exists condicao_pagamento text not null default '';

update public.contratos c
   set condicao_pagamento = x.meio_pagamento
  from (
    select distinct on (contrato_id) contrato_id, meio_pagamento
      from public.contrato_produtos
     where deleted_at is null and coalesce(trim(meio_pagamento), '') <> ''
     group by contrato_id, meio_pagamento
     order by contrato_id, count(*) desc
  ) x
 where x.contrato_id = c.id
   and c.condicao_pagamento = '';

-- Verificação:
-- select fornecedor_nome, condicao_pagamento from contratos where deleted_at is null;
