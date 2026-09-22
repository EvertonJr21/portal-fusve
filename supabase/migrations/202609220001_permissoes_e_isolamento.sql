-- Objetivo: isolamento de dados por usuário + admin com permissões por módulo.
-- Pedido do Everton (22/09/2026): cada comprador cuida de uma linha de produto
-- diferente (MatMed x Medicamento) — hoje todo autenticado vê tudo em todos
-- os módulos, sem noção de "dono" nem de papel de usuário. Ele quer:
--   1) cada usuário só ver/editar o que ELE cadastrou em OCs/Pareceres/
--      Contratos/OPME (Fornecedores continua compartilhado, é só cadastro/CNPJ)
--   2) um papel de admin que vê TUDO de todo mundo, e uma tela pra conceder/
--      revogar, por usuário e por módulo, permissão de ver e de editar
--      separadamente
-- Efeito colateral relevante: dados históricos (criados antes de auth.uid()
-- existir "dono") ficam todos atribuídos ao usuário mais antigo (assumido
-- Everton, primeira conta criada) — ver bloco de backfill abaixo. Usuários
-- não-admin já existentes ganham permissão total (ver+editar) nos 4 módulos
-- atuais no backfill, pra não perder acesso da noite pro dia — cabe ao
-- Everton reduzir depois pela tela /admin. Usuário criado DEPOIS desta
-- migration começa sem nenhuma permissão (módulo trancado até o admin
-- conceder explicitamente).
-- Risco: médio (schema novo + RLS reescrita em 8 tabelas), mas sem migração
-- destrutiva de dado — só ADD COLUMN/CREATE TABLE, backfill e troca de
-- policy. Testado o SQL isoladamente não é possível nesta sessão (MCP do
-- Supabase indisponível) — Everton roda no SQL Editor e confere com as
-- queries de verificação no fim do arquivo.
-- Rollback: reverter as policies pro estado de "authenticated_<tabela>"
-- (ver 202609170001_hardening_advisors_p0.sql) e dropar profiles/
-- permissoes_modulo/owner_id — não recomendado depois que o admin já tiver
-- configurado permissões reais.

-- ============================================================
-- 1) profiles — espelha auth.users com role (admin/user)
-- ============================================================
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nome       text default '',
  role       text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_select" on profiles
  for select using (id = (select auth.uid()) or exists (
    select 1 from profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  ));

create policy "profiles_update_admin" on profiles
  for update using (exists (
    select 1 from profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  ));

-- Trigger: toda conta nova em auth.users ganha uma linha em profiles
-- automaticamente (role 'user' por padrão), não importa se foi criada pela
-- Edge Function create-user, pelo Dashboard ou por convite.
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: todo auth.users que já existe e ainda não tem profiles
insert into profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ============================================================
-- 2) permissoes_modulo — por usuário, por módulo, ver/editar
-- ============================================================
-- `modulo` é texto livre (não enum fechado) de propósito — módulo novo no
-- futuro não exige migration nova pra ganhar uma linha de permissão, só um
-- upsert pela tela /admin. Os 4 valores usados hoje: 'ocs', 'pareceres',
-- 'contratos', 'opmes'.
create table if not exists permissoes_modulo (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  modulo     text not null,
  pode_ver   boolean not null default false,
  pode_editar boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, modulo)
);

create index if not exists idx_permissoes_modulo_user on permissoes_modulo(user_id);

alter table permissoes_modulo enable row level security;

create policy "permissoes_modulo_select" on permissoes_modulo
  for select using (
    user_id = (select auth.uid()) or exists (
      select 1 from profiles p where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

create policy "permissoes_modulo_admin_write" on permissoes_modulo
  for all using (exists (
    select 1 from profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  )) with check (exists (
    select 1 from profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  ));

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

-- Backfill de dado histórico: atribuído ao usuário mais antigo (assumido
-- Everton, primeira conta criada) — sem isso, RLS por owner_id esconderia
-- TODO o histórico de todo mundo, inclusive do admin (que só bypassa via
-- is_admin(), mas usuário comum ficaria sem nada). Ajustável depois com
-- UPDATE direto se a atribuição real for outra.
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

-- Backfill de permissão: usuário não-admin que já existe ganha ver+editar
-- nos 4 módulos atuais, pra não perder acesso no dia da migration — o admin
-- reduz depois pela tela /admin se quiser.
insert into permissoes_modulo (user_id, modulo, pode_ver, pode_editar)
select u.id, m.modulo, true, true
from auth.users u
cross join (values ('ocs'), ('pareceres'), ('contratos'), ('opmes')) as m(modulo)
where not exists (select 1 from profiles p where p.id = u.id and p.role = 'admin')
on conflict (user_id, modulo) do nothing;

-- ============================================================
-- 5) RLS das tabelas de dados — troca "authenticated_<tabela>" (qualquer
--    logado vê tudo) por isolamento owner_id + permissão de módulo,
--    com bypass total pra admin.
-- ============================================================

-- ocs
drop policy if exists "authenticated_ocs" on ocs;
create policy "ocs_select" on ocs for select
  using (is_admin() or (owner_id = auth.uid() and pode_ver_modulo('ocs')));
create policy "ocs_insert" on ocs for insert
  with check (is_admin() or pode_editar_modulo('ocs'));
create policy "ocs_update" on ocs for update
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')))
  with check (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')));
create policy "ocs_delete" on ocs for delete
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')));

-- sols (faz parte do módulo OCs)
drop policy if exists "authenticated_sols" on sols;
create policy "sols_select" on sols for select
  using (is_admin() or (owner_id = auth.uid() and pode_ver_modulo('ocs')));
create policy "sols_insert" on sols for insert
  with check (is_admin() or pode_editar_modulo('ocs'));
create policy "sols_update" on sols for update
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')))
  with check (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')));
create policy "sols_delete" on sols for delete
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('ocs')));

-- hist_oc (sem owner_id próprio — segue o dono da OC via oc_id)
drop policy if exists "authenticated_hist_oc" on hist_oc;
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
create policy "pareceres_select" on pareceres for select
  using (is_admin() or (owner_id = auth.uid() and pode_ver_modulo('pareceres')));
create policy "pareceres_insert" on pareceres for insert
  with check (is_admin() or pode_editar_modulo('pareceres'));
create policy "pareceres_update" on pareceres for update
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('pareceres')))
  with check (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('pareceres')));
create policy "pareceres_delete" on pareceres for delete
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('pareceres')));

-- parecer_anexos (sem owner_id próprio — segue o dono do parecer via parecer_cod)
drop policy if exists "authenticated_parecer_anexos" on parecer_anexos;
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

-- marcas_sugeridas (taxonomia compartilhada dentro do módulo Pareceres — não
-- tem "dono" próprio, só gated por permissão de módulo, igual Fornecedores
-- é gated só por autenticação)
drop policy if exists "authenticated_marcas_sugeridas" on marcas_sugeridas;
create policy "marcas_sugeridas_select" on marcas_sugeridas for select
  using (is_admin() or pode_ver_modulo('pareceres'));
create policy "marcas_sugeridas_write" on marcas_sugeridas for all
  using (is_admin() or pode_editar_modulo('pareceres'))
  with check (is_admin() or pode_editar_modulo('pareceres'));

-- contratos
drop policy if exists "authenticated_contratos" on contratos;
create policy "contratos_select" on contratos for select
  using (is_admin() or (owner_id = auth.uid() and pode_ver_modulo('contratos')));
create policy "contratos_insert" on contratos for insert
  with check (is_admin() or pode_editar_modulo('contratos'));
create policy "contratos_update" on contratos for update
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('contratos')))
  with check (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('contratos')));
create policy "contratos_delete" on contratos for delete
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('contratos')));

-- contrato_produtos (sem owner_id próprio — segue o dono do contrato via contrato_id)
drop policy if exists "authenticated_contrato_produtos" on contrato_produtos;
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
create policy "opmes_select" on opmes for select
  using (is_admin() or (owner_id = auth.uid() and pode_ver_modulo('opmes')));
create policy "opmes_insert" on opmes for insert
  with check (is_admin() or pode_editar_modulo('opmes'));
create policy "opmes_update" on opmes for update
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('opmes')))
  with check (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('opmes')));
create policy "opmes_delete" on opmes for delete
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('opmes')));

-- forns: deliberadamente NÃO mexido — continua "authenticated_forns" (todo
-- autenticado vê/edita), decisão explícita do Everton, é só cadastro/CNPJ
-- compartilhado entre módulos.

-- ============================================================
-- 6) PASSO MANUAL — promover a primeira conta admin
-- ============================================================
-- A migration não sabe qual é o e-mail do Everton, então ninguém vira admin
-- sozinho. Depois de rodar tudo acima, rode (trocando o e-mail):
--
--   update profiles set role = 'admin' where email = 'SEU_EMAIL_AQUI';
--
-- Sem isso, NINGUÉM (nem o Everton) vê nada nos módulos isolados além do
-- que a própria conta cadastrar daqui pra frente — o bypass de admin é
-- quem permite auditoria/visão geral.

-- ============================================================
-- Queries de verificação (rodar depois, conferir manualmente)
-- ============================================================
-- select count(*) from profiles;                                    -- == nº de auth.users
-- select id, email, role from profiles order by created_at;
-- select modulo, count(*) from permissoes_modulo group by modulo;   -- 4 linhas, uma por módulo
-- select count(*) from ocs where owner_id is null;                  -- 0
-- select count(*) from sols where owner_id is null;                 -- 0
-- select count(*) from pareceres where owner_id is null;            -- 0
-- select count(*) from contratos where owner_id is null;            -- 0
-- select count(*) from opmes where owner_id is null;                -- 0
