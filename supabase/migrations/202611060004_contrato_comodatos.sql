-- 202611060004_contrato_comodatos.sql
--
-- Equipamentos em comodato vinculados a um contrato/acordo comercial (item 83
-- do CLAUDE.md). Pedido do Everton: registrar os equipamentos que o fornecedor
-- deixou em comodato (ex.: bomba de infusão, equipamento de hemodinâmica) junto
-- do contrato que os sustenta.
--
-- Aditiva: só cria a tabela nova. Mesmo modelo de acesso de `contrato_produtos`
-- (segue o dono do contrato via `contrato_id`, permissão do módulo 'contratos',
-- admin vê tudo), com FORCE ROW LEVEL SECURITY desde a criação.
--
-- Rollback: DROP TABLE IF EXISTS contrato_comodatos;

create table if not exists public.contrato_comodatos (
  id               uuid primary key default gen_random_uuid(),
  contrato_id      uuid not null references public.contratos(id) on delete cascade,
  equipamento      text not null,
  fabricante_modelo text not null default '',
  numero_serie     text not null default '',
  patrimonio       text not null default '',
  quantidade       integer not null default 1 check (quantidade > 0),
  local_instalacao text not null default '',
  data_instalacao  date,
  valor_estimado   numeric(12,2) check (valor_estimado is null or valor_estimado >= 0),
  observacao       text not null default '',
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_contrato_comodatos_contrato on public.contrato_comodatos(contrato_id);

alter table public.contrato_comodatos enable row level security;
alter table public.contrato_comodatos force row level security;

drop policy if exists "contrato_comodatos_select" on public.contrato_comodatos;
drop policy if exists "contrato_comodatos_insert" on public.contrato_comodatos;
drop policy if exists "contrato_comodatos_update" on public.contrato_comodatos;
drop policy if exists "contrato_comodatos_delete" on public.contrato_comodatos;

create policy "contrato_comodatos_select" on public.contrato_comodatos for select
  using (is_admin() or (exists (
    select 1 from public.contratos c where c.id = contrato_comodatos.contrato_id and c.owner_id = auth.uid()
  ) and pode_ver_modulo('contratos')));

create policy "contrato_comodatos_insert" on public.contrato_comodatos for insert
  with check (is_admin() or (exists (
    select 1 from public.contratos c where c.id = contrato_comodatos.contrato_id and c.owner_id = auth.uid()
  ) and pode_editar_modulo('contratos')));

create policy "contrato_comodatos_update" on public.contrato_comodatos for update
  using (is_admin() or (exists (
    select 1 from public.contratos c where c.id = contrato_comodatos.contrato_id and c.owner_id = auth.uid()
  ) and pode_editar_modulo('contratos')));

create policy "contrato_comodatos_delete" on public.contrato_comodatos for delete
  using (is_admin() or (exists (
    select 1 from public.contratos c where c.id = contrato_comodatos.contrato_id and c.owner_id = auth.uid()
  ) and pode_editar_modulo('contratos')));

-- Verificação (deve listar as 4 policies e contar 0 linhas):
-- select policyname from pg_policies where tablename = 'contrato_comodatos';
-- select count(*) from contrato_comodatos;
