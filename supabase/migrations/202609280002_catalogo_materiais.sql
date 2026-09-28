-- Objetivo: novo módulo "Catálogo de Materiais por Área Hospitalar" — mostra
-- em quais setores do hospital cada tipo de material é usado, organizado
-- como Área (por hospital) → Item, com Grupo como categoria/tag livre do
-- item (não uma hierarquia fixa — ver nota abaixo) e módulo 'catalogo' em
-- permissoes_modulo, mesmo padrão dos outros 4 módulos.
--
-- Decisões de modelagem (acordadas com o Everton antes desta migration):
-- 1) `areas` é por hospital (`hospital_id`) — HUV e HMK podem ter setores
--    diferentes. `grupos` e `itens` são compartilhados entre os dois —
--    "Gaze estéril" ou "Sub Classe AGULHAS" não mudam por hospital.
-- 2) `grupos` NÃO pertence a uma área fixa — vira só uma categoria/tag do
--    item (ex: vindo de Classe/Sub Classe do SoulMV: "Material Médico —
--    Agulhas", "OPME — Ortopédica"). A fonte real de dado pra Grupo
--    (export do SoulMV) não carrega nenhuma informação de setor junto —
--    forçar Grupo a "morar" numa Área seria inventar essa associação.
-- 3) Item↔Grupo e Item↔Área são as duas junções N:N (`item_grupos`/
--    `item_areas`) — um item pode estar em 0, 1 ou vários grupos (ex:
--    luva em "Curativos" e "EPI"; cateter de quimioterapia só no grupo
--    dele) e em 0, 1 ou várias áreas, com `principal` marcando a área de
--    uso mais típico quando fizer sentido.
-- 4) Sem `owner_id` nas 5 tabelas — dado institucional compartilhado,
--    mesmo padrão de `marcas_sugeridas`/`forns` antes do isolamento por
--    usuário: RLS só verifica `pode_ver_modulo('catalogo')`/
--    `pode_editar_modulo('catalogo')`, sem filtro de dono.
-- 5) Marca aprovada/restrita não é duplicada aqui — a UI liga por
--    `itens.cod_soulmv = pareceres.cod` quando existir (mesmo padrão já
--    usado entre OC e Parecer), em vez de copiar campo que ficaria
--    dessincronizado e que hoje é isolado por usuário em `pareceres`.
--
-- Impacto: aditivo — 5 tabelas novas, nenhuma tabela existente é tocada.
-- Risco: baixo. `FORCE ROW LEVEL SECURITY` aplicado nas 5 tabelas desde já
-- (hardening recomendado depois do vazamento de dado do item 43 — mais
-- barato de aplicar em tabela nova do que retroativo).
-- Rollback: DROP TABLE das 5 tabelas + DELETE da linha 'catalogo' em
-- qualquer `permissoes_modulo` que já tenha sido gravada.
-- Backfill necessário: não. Carga de `itens`/`grupos`/`item_grupos` a
-- partir do CSV do SoulMV é feita depois por `scripts/import-catalogo.ts`,
-- fora desta migration. `item_areas` fica vazia — o Everton preenche
-- pesquisando o setor de cada item, pela tela de Gestão.

create table if not exists areas (
  id          uuid primary key default gen_random_uuid(),
  hospital_id text not null check (hospital_id in ('huv', 'mkr')),
  nome        text not null,
  ordem       integer not null default 0,
  ativo       boolean not null default true,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists grupos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  ordem      integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists itens (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  unidade_padrao text not null default '',
  cod_soulmv     text,
  sinonimos      text[] not null default '{}',
  observacao     text not null default '',
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists item_grupos (
  item_id  uuid not null references itens(id) on delete cascade,
  grupo_id uuid not null references grupos(id) on delete cascade,
  primary key (item_id, grupo_id)
);

create table if not exists item_areas (
  item_id    uuid not null references itens(id) on delete cascade,
  area_id    uuid not null references areas(id) on delete cascade,
  principal  boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (item_id, area_id)
);

create index if not exists idx_areas_hospital       on areas(hospital_id);
create index if not exists idx_grupos_nome          on grupos(nome);
create index if not exists idx_itens_nome           on itens(nome);
create index if not exists idx_itens_cod_soulmv     on itens(cod_soulmv);
create index if not exists idx_item_grupos_grupo    on item_grupos(grupo_id);
create index if not exists idx_item_areas_area      on item_areas(area_id);

alter table areas       enable row level security;
alter table areas       force row level security;
alter table grupos      enable row level security;
alter table grupos      force row level security;
alter table itens       enable row level security;
alter table itens       force row level security;
alter table item_grupos enable row level security;
alter table item_grupos force row level security;
alter table item_areas  enable row level security;
alter table item_areas  force row level security;

-- Mesmo padrão de `marcas_sugeridas` (dado compartilhado, sem owner_id):
-- select exige "ver", qualquer escrita exige "editar" — sem filtro de dono.
create policy "areas_select" on areas for select
  using (is_admin() or pode_ver_modulo('catalogo'));
create policy "areas_write" on areas for all
  using (is_admin() or pode_editar_modulo('catalogo'))
  with check (is_admin() or pode_editar_modulo('catalogo'));

create policy "grupos_select" on grupos for select
  using (is_admin() or pode_ver_modulo('catalogo'));
create policy "grupos_write" on grupos for all
  using (is_admin() or pode_editar_modulo('catalogo'))
  with check (is_admin() or pode_editar_modulo('catalogo'));

create policy "itens_select" on itens for select
  using (is_admin() or pode_ver_modulo('catalogo'));
create policy "itens_write" on itens for all
  using (is_admin() or pode_editar_modulo('catalogo'))
  with check (is_admin() or pode_editar_modulo('catalogo'));

create policy "item_grupos_select" on item_grupos for select
  using (is_admin() or pode_ver_modulo('catalogo'));
create policy "item_grupos_write" on item_grupos for all
  using (is_admin() or pode_editar_modulo('catalogo'))
  with check (is_admin() or pode_editar_modulo('catalogo'));

create policy "item_areas_select" on item_areas for select
  using (is_admin() or pode_ver_modulo('catalogo'));
create policy "item_areas_write" on item_areas for all
  using (is_admin() or pode_editar_modulo('catalogo'))
  with check (is_admin() or pode_editar_modulo('catalogo'));

-- Libera o módulo pra quem já tem os outros 4 liberados (mesmo espírito do
-- backfill da 202609220004) — evita que todo usuário existente precise ser
-- liberado manualmente um a um assim que a migration rodar.
insert into permissoes_modulo (user_id, modulo, pode_ver, pode_editar)
select p.id, 'catalogo', true, true
from profiles p
where not exists (
  select 1 from permissoes_modulo pm where pm.user_id = p.id and pm.modulo = 'catalogo'
)
on conflict (user_id, modulo) do nothing;

-- `handle_new_user()` (202609220002) só listava os 4 módulos que existiam
-- até então — reescrita aqui (CREATE OR REPLACE, mesma função, só a lista
-- de módulos muda) pra toda conta nova já nascer com 'catalogo' liberado
-- também, sem precisar de outra migration quando um módulo novo aparecer
-- de novo no futuro (mesma lista de MODULOS do front, ver src/constants).
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
  from (values ('ocs'), ('pareceres'), ('contratos'), ('opmes'), ('catalogo')) as m(modulo)
  on conflict (user_id, modulo) do nothing;

  return new;
end;
$$;
