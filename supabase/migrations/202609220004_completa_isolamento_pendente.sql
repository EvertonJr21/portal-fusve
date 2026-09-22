-- Objetivo: completa o que a migration 202609220001 deixou pra trás.
--
-- Descoberto rodando 202609220003 (22/09/2026): deu
-- "function is_admin() does not exist" — ou seja, a seção 3 (funções
-- auxiliares) da migration original NUNCA foi criada em produção, e como
-- as seções seguintes (owner_id + índices + backfill + todas as policies
-- de RLS de ocs/sols/hist_oc/pareceres/parecer_anexos/marcas_sugeridas/
-- contratos/contrato_produtos/opmes) referenciam essas funções, é quase
-- certo que elas também nunca aplicaram (cada `CREATE POLICY ... using
-- (is_admin() or ...)` teria dado o mesmíssimo erro). Só as seções 1 e 2
-- (tabelas `profiles`/`permissoes_modulo`) confirmadamente rodaram — são
-- as únicas sem dependência de `is_admin()`.
--
-- Hipótese mais provável: ao colar o SQL gigante manualmente no editor,
-- só uma parte do texto foi copiada/selecionada — sem erro visível porque
-- cada `CREATE TABLE`/`INSERT` das duas primeiras seções é independente,
-- e o corte aconteceu bem na fronteira da seção 3.
--
-- Este arquivo é uma cópia idempotente das seções 3, 4 e 5 da migration
-- 202609220001 (funções → owner_id/índices/backfill → RLS das 8 tabelas
-- de dado) — seguro rodar mesmo que uma parte já tenha ido (toda função é
-- `CREATE OR REPLACE`, toda coluna é `ADD COLUMN IF NOT EXISTS`, toda
-- policy é `DROP POLICY IF EXISTS` + `CREATE POLICY`). Depois de rodar
-- este arquivo, a 202609220003 (que falhou por causa do `is_admin()`
-- ausente) pode ser rodada de novo — mas na prática já não precisa, este
-- arquivo cobre profiles/permissoes_modulo também de novo via CREATE
-- OR REPLACE das funções e as policies delas continuam as que a 003 já
-- tentou criar (essas duas, `profiles_select`/`profiles_update_admin`/
-- `permissoes_modulo_select`/`permissoes_modulo_admin_write`, só existem
-- se a 003 tiver rodado com sucesso depois deste arquivo — rode a 003 de
-- novo em seguida, ou peça pra eu reincluir aqui se preferir só 1 arquivo).
--
-- Risco: baixo — nada aqui apaga dado. `owner_id` é aditivo; o backfill só
-- preenche onde está `NULL`; as policies substituem as antigas
-- (`authenticated_<tabela>`, que hoje ainda devem estar ativas nessas 8
-- tabelas — é por isso que, até rodar isto, o app provavelmente ainda
-- mostra os dados como compartilhados entre usuários, apesar de tudo que
-- já foi feito até aqui).

-- ============================================================
-- 3) Funções auxiliares — usadas nas policies das tabelas de dados
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.pode_ver_modulo(p_modulo text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.permissoes_modulo
    where user_id = auth.uid() and modulo = p_modulo and pode_ver
  );
$$;

create or replace function public.pode_editar_modulo(p_modulo text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.permissoes_modulo
    where user_id = auth.uid() and modulo = p_modulo and pode_editar
  );
$$;

-- ============================================================
-- 4) owner_id nas tabelas "de dados" dos 4 módulos isolados
-- ============================================================
alter table ocs       add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table sols       add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table pareceres  add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table contratos  add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table opmes      add column if not exists owner_id uuid references auth.users(id) default auth.uid();

create index if not exists idx_ocs_owner       on ocs(owner_id);
create index if not exists idx_sols_owner      on sols(owner_id);
create index if not exists idx_pareceres_owner on pareceres(owner_id);
create index if not exists idx_contratos_owner on contratos(owner_id);
create index if not exists idx_opmes_owner     on opmes(owner_id);

do $$
declare
  v_owner_padrao uuid;
begin
  select id into v_owner_padrao from auth.users order by created_at asc limit 1;
  if v_owner_padrao is not null then
    update ocs       set owner_id = v_owner_padrao where owner_id is null;
    update sols       set owner_id = v_owner_padrao where owner_id is null;
    update pareceres  set owner_id = v_owner_padrao where owner_id is null;
    update contratos  set owner_id = v_owner_padrao where owner_id is null;
    update opmes      set owner_id = v_owner_padrao where owner_id is null;
  end if;
end $$;

insert into permissoes_modulo (user_id, modulo, pode_ver, pode_editar)
select u.id, m.modulo, true, true
from auth.users u
cross join (values ('ocs'), ('pareceres'), ('contratos'), ('opmes')) as m(modulo)
where not exists (select 1 from profiles p where p.id = u.id and p.role = 'admin')
on conflict (user_id, modulo) do nothing;

-- ============================================================
-- 5) RLS das tabelas de dados
-- ============================================================

-- ocs
drop policy if exists "authenticated_ocs" on ocs;
drop policy if exists "ocs_select" on ocs;
drop policy if exists "ocs_insert" on ocs;
drop policy if exists "ocs_update" on ocs;
drop policy if exists "ocs_delete" on ocs;
create policy "ocs_select" on ocs for select
  using (is_admin() or (owner_id = auth.uid() and pode_ver_modulo('ocs')));
create policy "ocs_insert" on ocs for insert
  with check (is_admin() or pode_editar_modulo('ocs'));
create policy "ocs_update" on ocs for update
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')))
  with check (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')));
create policy "ocs_delete" on ocs for delete
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')));

-- sols
drop policy if exists "authenticated_sols" on sols;
drop policy if exists "sols_select" on sols;
drop policy if exists "sols_insert" on sols;
drop policy if exists "sols_update" on sols;
drop policy if exists "sols_delete" on sols;
create policy "sols_select" on sols for select
  using (is_admin() or (owner_id = auth.uid() and pode_ver_modulo('ocs')));
create policy "sols_insert" on sols for insert
  with check (is_admin() or pode_editar_modulo('ocs'));
create policy "sols_update" on sols for update
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')))
  with check (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')));
create policy "sols_delete" on sols for delete
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')));

-- hist_oc
drop policy if exists "authenticated_hist_oc" on hist_oc;
drop policy if exists "hist_oc_select" on hist_oc;
drop policy if exists "hist_oc_insert" on hist_oc;
drop policy if exists "hist_oc_update" on hist_oc;
drop policy if exists "hist_oc_delete" on hist_oc;
create policy "hist_oc_select" on hist_oc for select
  using (is_admin() or exists (
    select 1 from ocs o where o.id = hist_oc.oc_id and o.owner_id = auth.uid()
  ) and pode_ver_modulo('ocs'));
create policy "hist_oc_insert" on hist_oc for insert
  with check (is_admin() or pode_editar_modulo('ocs'));
create policy "hist_oc_update" on hist_oc for update
  using (is_admin() or exists (
    select 1 from ocs o where o.id = hist_oc.oc_id and o.owner_id = auth.uid()
  ) and pode_editar_modulo('ocs'));
create policy "hist_oc_delete" on hist_oc for delete
  using (is_admin() or exists (
    select 1 from ocs o where o.id = hist_oc.oc_id and o.owner_id = auth.uid()
  ) and pode_editar_modulo('ocs'));

-- pareceres
drop policy if exists "authenticated_pareceres" on pareceres;
drop policy if exists "pareceres_select" on pareceres;
drop policy if exists "pareceres_insert" on pareceres;
drop policy if exists "pareceres_update" on pareceres;
drop policy if exists "pareceres_delete" on pareceres;
create policy "pareceres_select" on pareceres for select
  using (is_admin() or (owner_id = auth.uid() and pode_ver_modulo('pareceres')));
create policy "pareceres_insert" on pareceres for insert
  with check (is_admin() or pode_editar_modulo('pareceres'));
create policy "pareceres_update" on pareceres for update
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('pareceres')))
  with check (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('pareceres')));
create policy "pareceres_delete" on pareceres for delete
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('pareceres')));

-- parecer_anexos
drop policy if exists "authenticated_parecer_anexos" on parecer_anexos;
drop policy if exists "parecer_anexos_select" on parecer_anexos;
drop policy if exists "parecer_anexos_insert" on parecer_anexos;
drop policy if exists "parecer_anexos_update" on parecer_anexos;
drop policy if exists "parecer_anexos_delete" on parecer_anexos;
create policy "parecer_anexos_select" on parecer_anexos for select
  using (is_admin() or exists (
    select 1 from pareceres pa where pa.cod = parecer_anexos.parecer_cod and pa.owner_id = auth.uid()
  ) and pode_ver_modulo('pareceres'));
create policy "parecer_anexos_insert" on parecer_anexos for insert
  with check (is_admin() or pode_editar_modulo('pareceres'));
create policy "parecer_anexos_update" on parecer_anexos for update
  using (is_admin() or exists (
    select 1 from pareceres pa where pa.cod = parecer_anexos.parecer_cod and pa.owner_id = auth.uid()
  ) and pode_editar_modulo('pareceres'));
create policy "parecer_anexos_delete" on parecer_anexos for delete
  using (is_admin() or exists (
    select 1 from pareceres pa where pa.cod = parecer_anexos.parecer_cod and pa.owner_id = auth.uid()
  ) and pode_editar_modulo('pareceres'));

-- marcas_sugeridas
drop policy if exists "authenticated_marcas_sugeridas" on marcas_sugeridas;
drop policy if exists "marcas_sugeridas_select" on marcas_sugeridas;
drop policy if exists "marcas_sugeridas_write" on marcas_sugeridas;
create policy "marcas_sugeridas_select" on marcas_sugeridas for select
  using (is_admin() or pode_ver_modulo('pareceres'));
create policy "marcas_sugeridas_write" on marcas_sugeridas for all
  using (is_admin() or pode_editar_modulo('pareceres'))
  with check (is_admin() or pode_editar_modulo('pareceres'));

-- contratos
drop policy if exists "authenticated_contratos" on contratos;
drop policy if exists "contratos_select" on contratos;
drop policy if exists "contratos_insert" on contratos;
drop policy if exists "contratos_update" on contratos;
drop policy if exists "contratos_delete" on contratos;
create policy "contratos_select" on contratos for select
  using (is_admin() or (owner_id = auth.uid() and pode_ver_modulo('contratos')));
create policy "contratos_insert" on contratos for insert
  with check (is_admin() or pode_editar_modulo('contratos'));
create policy "contratos_update" on contratos for update
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('contratos')))
  with check (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('contratos')));
create policy "contratos_delete" on contratos for delete
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('contratos')));

-- contrato_produtos
drop policy if exists "authenticated_contrato_produtos" on contrato_produtos;
drop policy if exists "contrato_produtos_select" on contrato_produtos;
drop policy if exists "contrato_produtos_insert" on contrato_produtos;
drop policy if exists "contrato_produtos_update" on contrato_produtos;
drop policy if exists "contrato_produtos_delete" on contrato_produtos;
create policy "contrato_produtos_select" on contrato_produtos for select
  using (is_admin() or exists (
    select 1 from contratos c where c.id = contrato_produtos.contrato_id and c.owner_id = auth.uid()
  ) and pode_ver_modulo('contratos'));
create policy "contrato_produtos_insert" on contrato_produtos for insert
  with check (is_admin() or pode_editar_modulo('contratos'));
create policy "contrato_produtos_update" on contrato_produtos for update
  using (is_admin() or exists (
    select 1 from contratos c where c.id = contrato_produtos.contrato_id and c.owner_id = auth.uid()
  ) and pode_editar_modulo('contratos'));
create policy "contrato_produtos_delete" on contrato_produtos for delete
  using (is_admin() or exists (
    select 1 from contratos c where c.id = contrato_produtos.contrato_id and c.owner_id = auth.uid()
  ) and pode_editar_modulo('contratos'));

-- opmes
drop policy if exists "authenticated_opmes" on opmes;
drop policy if exists "opmes_select" on opmes;
drop policy if exists "opmes_insert" on opmes;
drop policy if exists "opmes_update" on opmes;
drop policy if exists "opmes_delete" on opmes;
create policy "opmes_select" on opmes for select
  using (is_admin() or (owner_id = auth.uid() and pode_ver_modulo('opmes')));
create policy "opmes_insert" on opmes for insert
  with check (is_admin() or pode_editar_modulo('opmes'));
create policy "opmes_update" on opmes for update
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('opmes')))
  with check (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('opmes')));
create policy "opmes_delete" on opmes for delete
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('opmes')));

-- forns: continua compartilhado, não mexido (decisão do Everton).

-- ============================================================
-- Verificação (rodar depois)
-- ============================================================
-- select proname from pg_proc where proname in ('is_admin','pode_ver_modulo','pode_editar_modulo');  -- 3 linhas
-- select column_name from information_schema.columns where table_name='ocs' and column_name='owner_id';  -- 1 linha
-- select policyname from pg_policies where tablename='ocs';  -- ocs_select/ocs_insert/ocs_update/ocs_delete
-- select count(*) from ocs where owner_id is null;  -- 0
