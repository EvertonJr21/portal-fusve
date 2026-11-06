-- Remove o módulo Catálogo de Materiais do banco (item 77 do CLAUDE.md).
--
-- Pedido do Everton (06/11/2026): "Preciso que tire o módulo catálogo de
-- materiais, e todos os arquivos dele do nosso sistema, percebi que não vou
-- utilizar." O código do módulo (telas, repository, hook, script de carga)
-- já foi removido no mesmo commit desta migration.
--
-- ATENÇÃO — DESTRUTIVA E IRREVERSÍVEL: apaga as 5 tabelas do Catálogo com
-- todo o conteúdo (5.382 itens, 63 grupos, áreas do HUV/HMK, vínculos
-- item↔área e todos os resumos de uso). Não existe backup automático disso
-- no projeto. Nenhuma outra tabela referencia essas 5, então nada mais do
-- portal é afetado.
--
-- As migrations antigas do Catálogo (202609280002 até 202610010016)
-- continuam no repositório como histórico do que já rodou em produção;
-- esta aqui é a que desfaz tudo.
--
-- Idempotente: pode rodar de novo sem erro.

-- 1. Conta nova deixa de nascer com permissão no módulo 'catalogo'.
--    Mesma função da 202609280002, só sem 'catalogo' na lista.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.permissoes_modulo (user_id, modulo, pode_ver, pode_editar)
  select new.id, m.modulo, true, true
  from (values ('ocs'), ('pareceres'), ('contratos'), ('opmes')) as m(modulo)
  on conflict (user_id, modulo) do nothing;

  return new;
end;
$$;

-- 2. Permissões já concedidas pro módulo removido.
delete from public.permissoes_modulo where modulo = 'catalogo';

-- 3. Tabelas do Catálogo (junções primeiro; cascade derruba policies/índices).
drop table if exists public.item_areas cascade;
drop table if exists public.item_grupos cascade;
drop table if exists public.itens cascade;
drop table if exists public.grupos cascade;
drop table if exists public.areas cascade;

-- Verificação (rodar depois): as duas consultas devem voltar 0.
--   select count(*) from information_schema.tables
--    where table_schema = 'public' and table_name in ('areas','grupos','itens','item_grupos','item_areas');
--   select count(*) from permissoes_modulo where modulo = 'catalogo';
