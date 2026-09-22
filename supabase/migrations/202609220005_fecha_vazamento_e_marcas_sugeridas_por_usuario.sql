-- Objetivo: dois problemas reais achados testando em produção (22/09/2026)
-- depois de rodar as migrations 202609220001-04:
--
-- 1) VAZAMENTO DE DADO ENTRE USUÁRIOS: o Everton reportou que, logado com a
--    segunda conta (`compras.11@fusve.org.br`, papel `user`, sem ser admin),
--    a Base de Pareceres mostrava os 98 registros — o total da base inteira,
--    não só o que essa conta cadastrou (que deveria ser 0, já que o histórico
--    foi todo atribuído à conta mais antiga no backfill). Causa mais provável:
--    a policy antiga `authenticated_<tabela>` (libera pra QUALQUER
--    autenticado) não foi de fato removida numa das migrations anteriores —
--    mesmo padrão de cópia parcial já visto 2x nesta sessão. Como o Postgres
--    combina múltiplas policies da mesma operação com OR, bastava a antiga
--    continuar existindo pra anular o isolamento novo, mesmo com as policies
--    corretas (`pareceres_select` etc.) também presentes. Este arquivo faz um
--    DROP explícito e incondicional de TODAS as policies antigas
--    `authenticated_<tabela>`, nas 8 tabelas de dado — idempotente, sem
--    efeito se elas já tiverem sido removidas.
--
-- 2) `marcas_sugeridas` PRECISA SER POR USUÁRIO TAMBÉM: pedido novo do
--    Everton — "cada um deveria ter a recomendação de marcas sugeridas, de
--    acordo com cada setor" (MatMed vs Medicamento têm listas diferentes).
--    Até aqui essa tabela era tratada como taxonomia compartilhada (só
--    gated por `pode_ver_modulo('pareceres')`, sem `owner_id`). Muda pra
--    isolada como as demais: ganha `owner_id`, a chave deixa de ser só
--    `cat` (agora pode repetir entre usuários diferentes) e vira
--    `UNIQUE (owner_id, cat)`. As 39 categorias que já existiam ficam
--    atribuídas ao usuário mais antigo no backfill (mesmo critério das
--    outras tabelas) — outros usuários começam sem nenhuma sugestão pra
--    essa categoria até cadastrarem a própria, pela tela
--    /pareceres/marcas-sugeridas.
--
-- Risco: baixo — statement 1 só remove policy permissiva redundante
-- (a correta continua no lugar); statement 2 é uma mudança de schema
-- pequena numa tabela de 39 linhas, sem apagar dado (só reatribui dono).

-- ============================================================
-- 1) Rede de segurança — garante que a policy antiga sumiu de vez
-- ============================================================
drop policy if exists "authenticated_ocs"               on ocs;
drop policy if exists "authenticated_sols"               on sols;
drop policy if exists "authenticated_hist_oc"            on hist_oc;
drop policy if exists "authenticated_pareceres"          on pareceres;
drop policy if exists "authenticated_parecer_anexos"     on parecer_anexos;
drop policy if exists "authenticated_marcas_sugeridas"   on marcas_sugeridas;
drop policy if exists "authenticated_contratos"          on contratos;
drop policy if exists "authenticated_contrato_produtos"  on contrato_produtos;
drop policy if exists "authenticated_opmes"              on opmes;

-- ============================================================
-- 2) marcas_sugeridas — isolamento por usuário
-- ============================================================
alter table marcas_sugeridas add column if not exists owner_id uuid references auth.users(id) default auth.uid();

do $$
declare
  v_owner_padrao uuid;
begin
  select id into v_owner_padrao from auth.users order by created_at asc limit 1;
  if v_owner_padrao is not null then
    update marcas_sugeridas set owner_id = v_owner_padrao where owner_id is null;
  end if;
end $$;

alter table marcas_sugeridas alter column owner_id set not null;

-- a PK original era só `cat` — vira UNIQUE (owner_id, cat), já que agora
-- a mesma categoria pode existir uma vez por usuário.
alter table marcas_sugeridas drop constraint if exists marcas_sugeridas_pkey;
alter table marcas_sugeridas add constraint marcas_sugeridas_owner_cat_key unique (owner_id, cat);
create index if not exists idx_marcas_sugeridas_owner on marcas_sugeridas(owner_id);

drop policy if exists "marcas_sugeridas_select" on marcas_sugeridas;
drop policy if exists "marcas_sugeridas_write" on marcas_sugeridas;
drop policy if exists "marcas_sugeridas_insert" on marcas_sugeridas;
drop policy if exists "marcas_sugeridas_update" on marcas_sugeridas;
drop policy if exists "marcas_sugeridas_delete" on marcas_sugeridas;

create policy "marcas_sugeridas_select" on marcas_sugeridas for select
  using (is_admin() or (owner_id = auth.uid() and pode_ver_modulo('pareceres')));
create policy "marcas_sugeridas_insert" on marcas_sugeridas for insert
  with check (is_admin() or pode_editar_modulo('pareceres'));
create policy "marcas_sugeridas_update" on marcas_sugeridas for update
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('pareceres')))
  with check (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('pareceres')));
create policy "marcas_sugeridas_delete" on marcas_sugeridas for delete
  using (is_admin() or (owner_id = auth.uid() and pode_editar_modulo('pareceres')));

-- ============================================================
-- Verificação (rodar depois)
-- ============================================================
-- select tablename, policyname from pg_policies where policyname like 'authenticated_%';  -- 0 linhas
-- select count(*) from marcas_sugeridas where owner_id is null;                           -- 0
-- select cat, owner_id from marcas_sugeridas order by cat;
