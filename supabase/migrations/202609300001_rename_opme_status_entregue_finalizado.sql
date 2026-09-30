-- Renomeia o valor de status 'entregue' -> 'finalizado' em opmes.status.
-- Pedido do Everton (30/09/2026). Mesmo significado (OPME chegou antes da
-- cirurgia), só troca o rótulo interno — dessa vez o valor armazenado
-- mesmo, não só o texto exibido (ver item de backlog: a rodada de
-- 22/09/2026, cd66511, tinha trocado só o rótulo, mantendo 'entregue'
-- gravado; o Everton confirmou em 30/09/2026 que queria o valor mesmo
-- renomeado). Aplicada em produção via mcp__supabase__apply_migration
-- (não pelo SQL Editor). 9 linhas existentes com status='entregue' foram
-- atualizadas pra 'finalizado' nesta migration.
alter table public.opmes drop constraint if exists opmes_status_check;

update public.opmes set status = 'finalizado' where status = 'entregue';

alter table public.opmes
  add constraint opmes_status_check
  check (status in ('pendente', 'finalizado'));
