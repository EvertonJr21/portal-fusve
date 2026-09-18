-- Objetivo: corrigir os 3 achados do Supabase Advisor (security + performance)
--   detectados em auditoria de 17/09/2026:
--   1) função update_updated_at() com search_path mutável (SECURITY WARN)
--   2) 9 policies de RLS reavaliando auth.role() por linha em vez de usar
--      (select auth.role()) — Postgres não consegue cachear como InitPlan
--      (PERFORMANCE WARN, lint auth_rls_initplan)
--   3) FK opmes.fornecedor_id sem índice de cobertura (PERFORMANCE INFO)
--   Aproveitado pra padronizar o nome de todas as policies como
--   authenticated_<tabela> (hoje marcas_sugeridas/opmes usavam auth_<tabela>).
-- Impacto: nenhuma regra de acesso muda — mesma condição lógica
--   (auth.role() = 'authenticated'), só a forma de avaliação. Login,
--   RLS e comportamento do app ficam idênticos ao antes.
-- Risco: baixo. DROP+CREATE de policy é atômico dentro da migration; se algo
--   falhar no meio, a migration inteira não aplica (transação única).
-- Rollback: recriar as policies antigas com os nomes/condições originais
--   (auth.role() sem select) e reverter o search_path da função pra padrão.
-- Backfill necessário: não.

-- 1) Função com search_path mutável
alter function public.update_updated_at() set search_path = '';

-- 2) Índice de cobertura pra FK que faltava
create index if not exists idx_opmes_fornecedor on public.opmes(fornecedor_id);

-- 3) Policies: (select auth.role()) em vez de auth.role() direto, nomes padronizados
drop policy if exists "authenticated_ocs" on public.ocs;
create policy "authenticated_ocs" on public.ocs
  for all using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

drop policy if exists "authenticated_sols" on public.sols;
create policy "authenticated_sols" on public.sols
  for all using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

drop policy if exists "authenticated_forns" on public.forns;
create policy "authenticated_forns" on public.forns
  for all using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

drop policy if exists "authenticated_hist_oc" on public.hist_oc;
create policy "authenticated_hist_oc" on public.hist_oc
  for all using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

drop policy if exists "authenticated_pareceres" on public.pareceres;
create policy "authenticated_pareceres" on public.pareceres
  for all using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

drop policy if exists "authenticated_contratos" on public.contratos;
create policy "authenticated_contratos" on public.contratos
  for all using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

drop policy if exists "authenticated_contrato_produtos" on public.contrato_produtos;
create policy "authenticated_contrato_produtos" on public.contrato_produtos
  for all using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

drop policy if exists "auth_marcas_sugeridas" on public.marcas_sugeridas;
create policy "authenticated_marcas_sugeridas" on public.marcas_sugeridas
  for all using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

drop policy if exists "auth_opmes" on public.opmes;
create policy "authenticated_opmes" on public.opmes
  for all using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');
