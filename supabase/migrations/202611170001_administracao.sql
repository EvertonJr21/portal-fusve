-- 202611170001_administracao.sql — item 113 do backlog (17/11/2026)
--
-- Nova Administração do Portal FUSVE. Aditiva e idempotente: só cria tabela,
-- funções e triggers, não altera nem apaga dado existente. Pode rodar de novo.
--
--   1. admin_auditoria — registro de quem fez o quê na administração
--      (permissão alterada, papel, suspensão, senha redefinida, conta
--      excluída, registros transferidos, conta criada).
--   2. Triggers que gravam sozinhos: permissão por módulo e papel/suspensão
--      (quando a mudança vem de alguém logado) e conta criada.
--   3. registrar_acao_admin() — usada pela tela depois das ações que passam
--      pelas Edge Functions (senha, suspensão, exclusão), onde o banco não
--      sabe quem é o admin.
--   4. admin_listar_contas() — último acesso, e-mail confirmado e bloqueio
--      de cada conta (vem de auth.users, que a tela não consegue ler direto).
--
-- Rollback:
--   drop trigger if exists trg_audit_permissoes on public.permissoes_modulo;
--   drop trigger if exists trg_audit_profiles on public.profiles;
--   drop function if exists public.audit_permissoes();
--   drop function if exists public.audit_profiles();
--   drop function if exists public.registrar_acao_admin(text, uuid, text, text);
--   drop function if exists public.admin_listar_contas();
--   drop table if exists public.admin_auditoria;

-- ───────────────────────── 1. Tabela ─────────────────────────

create table if not exists public.admin_auditoria (
  id          bigint generated always as identity primary key,
  ator_id     uuid,
  ator_email  text not null default '',
  acao        text not null,   -- permissao | papel | suspensao | senha | exclusao | transferencia | conta_criada
  alvo_id     uuid,
  alvo_email  text not null default '',
  detalhe     text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists idx_admin_auditoria_created on public.admin_auditoria (created_at desc);
create index if not exists idx_admin_auditoria_alvo on public.admin_auditoria (alvo_id, created_at desc);

alter table public.admin_auditoria enable row level security;
alter table public.admin_auditoria force row level security;

-- Só leitura pela tela, só admin. Quem grava são os triggers e a função abaixo (SECURITY DEFINER).
drop policy if exists "admin_auditoria_select" on public.admin_auditoria;
create policy "admin_auditoria_select" on public.admin_auditoria for select using (public.is_admin());

-- ───────────────────────── 2. Triggers ─────────────────────────

create or replace function public.audit_permissoes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ator  uuid := auth.uid();
  v_texto text;
  antes   text;
  depois  text;
begin
  -- Sem usuário logado = permissão padrão de conta nova (handle_new_user): não é ação de admin.
  if v_ator is null then
    return new;
  end if;
  depois := case when new.pode_editar then 'ver e editar' when new.pode_ver then 'só ver' else 'sem acesso' end;
  if tg_op = 'UPDATE' then
    if old.pode_ver = new.pode_ver and old.pode_editar = new.pode_editar then
      return new;
    end if;
    antes := case when old.pode_editar then 'ver e editar' when old.pode_ver then 'só ver' else 'sem acesso' end;
  else
    antes := 'sem acesso';
  end if;
  v_texto := new.modulo || ': ' || antes || ' → ' || depois;
  insert into public.admin_auditoria (ator_id, ator_email, acao, alvo_id, alvo_email, detalhe)
  values (
    v_ator,
    coalesce((select email from public.profiles where id = v_ator), ''),
    'permissao',
    new.user_id,
    coalesce((select email from public.profiles where id = new.user_id), ''),
    v_texto
  );
  return new;
end;
$$;

drop trigger if exists trg_audit_permissoes on public.permissoes_modulo;
create trigger trg_audit_permissoes
  after insert or update on public.permissoes_modulo
  for each row execute function public.audit_permissoes();

create or replace function public.audit_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ator uuid := auth.uid();
  v_email text := coalesce((select email from public.profiles where id = v_ator), '');
begin
  if tg_op = 'INSERT' then
    insert into public.admin_auditoria (ator_id, ator_email, acao, alvo_id, alvo_email, detalhe)
    values (new.id, new.email, 'conta_criada', new.id, new.email, 'Conta criada');
    return new;
  end if;
  -- Papel: a tela grava com a sessão do admin, então dá pra saber quem foi.
  if new.role is distinct from old.role and v_ator is not null then
    insert into public.admin_auditoria (ator_id, ator_email, acao, alvo_id, alvo_email, detalhe)
    values (v_ator, v_email, 'papel', new.id, new.email,
            case when new.role = 'admin' then 'Promovido a admin' else 'Papel de admin removido' end);
  end if;
  -- Suspensão via Edge Function (sem sessão) é registrada pela tela, com registrar_acao_admin().
  if new.suspensa is distinct from old.suspensa and v_ator is not null then
    insert into public.admin_auditoria (ator_id, ator_email, acao, alvo_id, alvo_email, detalhe)
    values (v_ator, v_email, 'suspensao', new.id, new.email,
            case when new.suspensa then 'Conta suspensa' else 'Conta reativada' end);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles
  after insert or update on public.profiles
  for each row execute function public.audit_profiles();

-- ───────────────────────── 3. Ação registrada pela tela ─────────────────────────

create or replace function public.registrar_acao_admin(p_acao text, p_alvo_id uuid, p_alvo_email text, p_detalhe text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Somente administradores.';
  end if;
  if p_acao not in ('suspensao', 'senha', 'exclusao', 'transferencia') then
    raise exception 'Ação inválida.';
  end if;
  insert into public.admin_auditoria (ator_id, ator_email, acao, alvo_id, alvo_email, detalhe)
  values (
    auth.uid(),
    coalesce((select email from public.profiles where id = auth.uid()), ''),
    p_acao,
    p_alvo_id,
    coalesce(p_alvo_email, ''),
    left(coalesce(p_detalhe, ''), 500)
  );
end;
$$;

revoke all on function public.registrar_acao_admin(text, uuid, text, text) from public, anon;
grant execute on function public.registrar_acao_admin(text, uuid, text, text) to authenticated;

-- ───────────────────────── 4. Último acesso das contas ─────────────────────────

create or replace function public.admin_listar_contas()
returns table (
  id uuid,
  ultimo_acesso timestamptz,
  email_confirmado boolean,
  bloqueada_ate timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Somente administradores.';
  end if;
  return query
    select u.id, u.last_sign_in_at, u.email_confirmed_at is not null, u.banned_until
    from auth.users u;
end;
$$;

revoke all on function public.admin_listar_contas() from public, anon;
grant execute on function public.admin_listar_contas() to authenticated;

-- Verificação (rodar depois):
-- select count(*) from public.admin_auditoria;                       -- 0 (tabela criada)
-- select tgname from pg_trigger where tgname like 'trg_audit_%';     -- 2 linhas
-- select * from public.admin_listar_contas();                        -- no SQL Editor dá "Somente administradores" (lá não há sessão); na tela funciona
