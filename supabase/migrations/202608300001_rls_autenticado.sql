-- Reconstrução — ver supabase/migrations/README.md.
-- CLAUDE.md (backlog item 12) descreve o resultado final ("todas as 7
-- tabelas exigem auth.role() = 'authenticated'") e um achado: policies
-- órfãs com nomes não documentados (anon_read_ocs/anon_write_ocs,
-- anon_read_sols/anon_write_sols, anon_read_forns/anon_write_forns,
-- anon_hist) sobreviveram ao primeiro script e liberavam acesso anônimo
-- mesmo depois dele rodar, até serem apagadas manualmente. Esta migration
-- reconstrói as duas etapas descritas (troca das policies documentadas +
-- limpeza das órfãs) num único arquivo idempotente.
--
-- Objetivo: fechar RLS para authenticated-only, pré-requisito do primeiro
-- deploy público (Autenticação real, item 13 do backlog).
-- Impacto: acesso sem sessão (anon key sozinha) passa a retornar array
-- vazio em vez de dados reais — verificado via fetch direto na API sem
-- token.
-- Risco: baixo — já validado em produção (usuário logado continua vendo os
-- dados normalmente).
-- Rollback: recriar as policies "anon_*" de 202608290001 (não recomendado —
-- reabre acesso público aos dados).
-- Backfill necessário: não.

DROP POLICY IF EXISTS "anon_ocs"               ON ocs;
DROP POLICY IF EXISTS "anon_sols"              ON sols;
DROP POLICY IF EXISTS "anon_forns"             ON forns;
DROP POLICY IF EXISTS "anon_hist_oc"           ON hist_oc;
DROP POLICY IF EXISTS "anon_pareceres"         ON pareceres;
DROP POLICY IF EXISTS "anon_contratos"         ON contratos;
DROP POLICY IF EXISTS "anon_contrato_produtos" ON contrato_produtos;

-- Policies órfãs achadas via pg_policies, sem nome documentado até então.
DROP POLICY IF EXISTS "anon_read_ocs"    ON ocs;
DROP POLICY IF EXISTS "anon_write_ocs"   ON ocs;
DROP POLICY IF EXISTS "anon_read_sols"   ON sols;
DROP POLICY IF EXISTS "anon_write_sols"  ON sols;
DROP POLICY IF EXISTS "anon_read_forns"  ON forns;
DROP POLICY IF EXISTS "anon_write_forns" ON forns;
DROP POLICY IF EXISTS "anon_hist"        ON hist_oc;

CREATE POLICY "auth_ocs"               ON ocs               FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_sols"              ON sols              FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_forns"             ON forns             FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_hist_oc"           ON hist_oc           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_pareceres"         ON pareceres         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_contratos"         ON contratos         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_contrato_produtos" ON contrato_produtos FOR ALL USING (auth.role() = 'authenticated');

-- Conferência pós-migração (rodar manualmente, não é parte da migration):
-- SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname = 'public';
