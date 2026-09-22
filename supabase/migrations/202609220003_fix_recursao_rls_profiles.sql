-- Objetivo: corrige "infinite recursion detected in policy for relation
-- profiles" — bug real achado em produção (22/09/2026) depois de rodar as
-- duas migrations anteriores: a Central de Módulos ficou mostrando "Nenhum
-- módulo liberado" pra TODO MUNDO, inclusive pra conta admin (que devia ver
-- tudo sem depender de `permissoes_modulo`).
--
-- Causa: `profiles_select` e `permissoes_modulo_select`/`_admin_write`
-- (migration 202609220001) checavam "é admin?" com um subselect direto
-- contra a própria tabela `profiles`:
--   exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
-- Uma policy de SELECT que lê a mesma tabela que ela protege reaplica essa
-- MESMA policy pra avaliar a subquery — recursão infinita, Postgres aborta
-- com erro. Não aparecia no SQL Editor porque lá você roda como owner do
-- projeto (RLS não se aplica); só aparece pro app, que usa a anon key +
-- sessão do usuário comum, sujeita a RLS de verdade.
--
-- A função `is_admin()` (mesma migration 202609220001) já existe
-- exatamente pra evitar isso — é `SECURITY DEFINER`, roda com o
-- privilégio de quem criou a função (bypassa RLS ao ler `profiles`), então
-- não reaplica a policy de `profiles` recursivamente. Só faltava usá-la
-- aqui em vez do subselect inline.
--
-- Risco: baixo — só troca a condição de 4 policies (`DROP` + `CREATE`),
-- mesma regra de acesso de antes (admin vê tudo, usuário comum só a
-- própria linha), nenhum dado tocado.

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select using (id = (select auth.uid()) or is_admin());

drop policy if exists "profiles_update_admin" on profiles;
create policy "profiles_update_admin" on profiles
  for update using (is_admin());

drop policy if exists "permissoes_modulo_select" on permissoes_modulo;
create policy "permissoes_modulo_select" on permissoes_modulo
  for select using (user_id = (select auth.uid()) or is_admin());

drop policy if exists "permissoes_modulo_admin_write" on permissoes_modulo;
create policy "permissoes_modulo_admin_write" on permissoes_modulo
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- Verificação (rodar depois, logado como usuário comum não dá pra testar
-- direto no SQL Editor — ele sempre bypassa RLS. Testar de verdade é abrir
-- o app e ver se a Central de Módulos carrega. Esta query só confirma que
-- o SELECT simples continua funcionando pro dono do projeto)
-- ============================================================
-- select id, email, role from profiles;
