-- 202611110001_historico_erros_pdf_contrato.sql
--
-- Itens 6, 10 e 14 da revisão geral (CLAUDE.md, itens 93, 95 e 98 do backlog):
--   1. historico_alteracoes — quem mudou o quê e quando em OCs e contratos
--      (gravado por trigger no banco, então vale pra tela, importação e SQL Editor).
--   2. erros_app — registro automático de erros da tela.
--   3. PDF do contrato assinado (colunas em `contratos` + bucket `contratos-pdfs`).
--
-- Aditiva e idempotente: só cria tabela/coluna/trigger/bucket, não altera nem apaga
-- dado existente. Pode rodar de novo sem erro.
--
-- Rollback:
--   drop trigger if exists trg_hist_ocs on public.ocs;
--   drop trigger if exists trg_hist_contratos on public.contratos;
--   drop trigger if exists trg_hist_contrato_produtos on public.contrato_produtos;
--   drop function if exists public.registrar_alteracao();
--   drop function if exists public.registrar_alteracao_produto();
--   drop table if exists public.historico_alteracoes;
--   drop table if exists public.erros_app;
--   alter table public.contratos drop column if exists pdf_path, drop column if exists pdf_nome;

-- ───────────────────────── 1. Histórico de alterações ─────────────────────────

create table if not exists public.historico_alteracoes (
  id          bigint generated always as identity primary key,
  tabela      text not null,          -- 'ocs' | 'contratos'
  registro_id text not null,          -- id da OC / do contrato
  campo       text not null,
  de          text,
  para        text,
  user_id     uuid default auth.uid(),
  user_email  text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists idx_historico_alteracoes_registro
  on public.historico_alteracoes (tabela, registro_id, created_at desc);

alter table public.historico_alteracoes enable row level security;
alter table public.historico_alteracoes force row level security;

-- Só leitura pela tela: admin vê tudo; os demais veem o que eles mesmos alteraram
-- e o histórico dos registros de que são donos. Não há policy de insert/update/delete
-- — quem grava é o trigger (SECURITY DEFINER).
drop policy if exists "historico_alteracoes_select" on public.historico_alteracoes;
create policy "historico_alteracoes_select" on public.historico_alteracoes for select
  using (
    public.is_admin()
    or user_id = (select auth.uid())
    or (tabela = 'ocs' and exists (
      select 1 from public.ocs o where o.id::text = historico_alteracoes.registro_id and o.owner_id = (select auth.uid())))
    or (tabela = 'contratos' and exists (
      select 1 from public.contratos c where c.id::text = historico_alteracoes.registro_id and c.owner_id = (select auth.uid())))
  );

-- Trigger genérico: os argumentos são as colunas a acompanhar.
create or replace function public.registrar_alteracao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  col     text;
  v_old   jsonb := to_jsonb(old);
  v_new   jsonb := to_jsonb(new);
  v_email text;
begin
  select p.email into v_email from public.profiles p where p.id = auth.uid();
  foreach col in array tg_argv loop
    if (v_old ->> col) is distinct from (v_new ->> col) then
      insert into public.historico_alteracoes (tabela, registro_id, campo, de, para, user_id, user_email)
      values (tg_table_name, v_new ->> 'id', col, v_old ->> col, v_new ->> col, auth.uid(), coalesce(v_email, ''));
    end if;
  end loop;
  return new;
end;
$$;

-- Preço de produto de contrato: fica no histórico do contrato, com o nome do produto.
create or replace function public.registrar_alteracao_produto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_nome  text := coalesce(nullif(new.descricao, ''), new.cod_soulmv, 'produto');
begin
  select p.email into v_email from public.profiles p where p.id = auth.uid();
  if old.preco_unitario is distinct from new.preco_unitario then
    insert into public.historico_alteracoes (tabela, registro_id, campo, de, para, user_id, user_email)
    values ('contratos', new.contrato_id::text, 'preco_unitario: ' || v_nome,
            old.preco_unitario::text, new.preco_unitario::text, auth.uid(), coalesce(v_email, ''));
  end if;
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.historico_alteracoes (tabela, registro_id, campo, de, para, user_id, user_email)
    values ('contratos', new.contrato_id::text, 'produto_removido', v_nome, null, auth.uid(), coalesce(v_email, ''));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_hist_ocs on public.ocs;
create trigger trg_hist_ocs after update on public.ocs
  for each row execute function public.registrar_alteracao(
    'sit', 'previsao_forn_date', 'previsao_forn2_date', 'data_entrega_real_date',
    'data_parcial_date', 'motivo_atraso', 'solicitacao_id', 'deleted_at');

drop trigger if exists trg_hist_contratos on public.contratos;
create trigger trg_hist_contratos after update on public.contratos
  for each row execute function public.registrar_alteracao(
    'titulo', 'status', 'vigencia_inicio', 'vigencia_fim', 'prazo_medio_dias',
    'condicao_pagamento', 'deleted_at');

drop trigger if exists trg_hist_contrato_produtos on public.contrato_produtos;
create trigger trg_hist_contrato_produtos after update on public.contrato_produtos
  for each row execute function public.registrar_alteracao_produto();

-- ───────────────────────── 2. Registro de erros da tela ─────────────────────────

create table if not exists public.erros_app (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid default auth.uid(),
  user_email text not null default '',
  mensagem   text not null,
  detalhe    text not null default '',
  url        text not null default '',
  navegador  text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_erros_app_created on public.erros_app (created_at desc);

alter table public.erros_app enable row level security;
alter table public.erros_app force row level security;

drop policy if exists "erros_app_insert" on public.erros_app;
drop policy if exists "erros_app_select" on public.erros_app;
drop policy if exists "erros_app_delete" on public.erros_app;
create policy "erros_app_insert" on public.erros_app for insert
  with check ((select auth.uid()) is not null);
create policy "erros_app_select" on public.erros_app for select using (public.is_admin());
create policy "erros_app_delete" on public.erros_app for delete using (public.is_admin());

-- ───────────────────────── 3. PDF do contrato assinado ─────────────────────────

alter table public.contratos add column if not exists pdf_path text;
alter table public.contratos add column if not exists pdf_nome text;

insert into storage.buckets (id, name, public)
values ('contratos-pdfs', 'contratos-pdfs', false)
on conflict (id) do nothing;

drop policy if exists "auth_select_contratos_pdfs" on storage.objects;
drop policy if exists "auth_insert_contratos_pdfs" on storage.objects;
drop policy if exists "auth_update_contratos_pdfs" on storage.objects;
drop policy if exists "auth_delete_contratos_pdfs" on storage.objects;
create policy "auth_select_contratos_pdfs" on storage.objects for select to authenticated using (bucket_id = 'contratos-pdfs');
create policy "auth_insert_contratos_pdfs" on storage.objects for insert to authenticated with check (bucket_id = 'contratos-pdfs');
create policy "auth_update_contratos_pdfs" on storage.objects for update to authenticated using (bucket_id = 'contratos-pdfs');
create policy "auth_delete_contratos_pdfs" on storage.objects for delete to authenticated using (bucket_id = 'contratos-pdfs');

-- Verificação (3 linhas, depois 3 triggers, depois as 2 colunas):
-- select tablename from pg_tables where tablename in ('historico_alteracoes', 'erros_app');
-- select tgname from pg_trigger where tgname like 'trg_hist_%';
-- select column_name from information_schema.columns where table_name = 'contratos' and column_name like 'pdf_%';
