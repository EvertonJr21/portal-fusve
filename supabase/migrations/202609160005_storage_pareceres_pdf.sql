-- NOVA — ainda NÃO aplicada em produção. Everton precisa rodar no SQL Editor.
--
-- Objetivo: Hardening (CLAUDE_ENGINEERING.md seção 12, "PDF não deve ser
-- armazenado em base64 no Postgres") — cria o Supabase Storage bucket
-- `pareceres-pdfs` (privado) e adiciona `pareceres.pdf_path`, a coluna nova
-- que vai guardar o caminho do arquivo no Storage em vez do PDF inteiro em
-- base64 dentro de `pdf_data_url` (text).
--
-- Fase 1 (aditiva, mesmo espírito da migração de datas texto→date): só cria
-- bucket + coluna nova, não mexe em `pdf_data_url` nem em nenhum dado
-- existente. A troca de código (Fase 2) já vem junto neste commit —
-- `parecerRepository.ts`/`ParecerForm.tsx`/`ParecerCard.tsx`/`Base.tsx` já
-- passam a usar Storage pra PDF novo, mas continuam lendo `pdf_data_url`
-- como fallback pros pareceres que ainda não migraram. O backfill dos PDFs
-- já existentes em base64 (se houver algum) é feito por
-- `scripts/backfill-pareceres-pdf-storage.ts` (rodar depois desta migration).
--
-- Impacto: nenhum em dado existente. Bucket privado — só usuário autenticado
-- lê/escreve, mesmo padrão de RLS do resto do banco.
-- Risco: baixo.
-- Rollback:
--   DROP POLICY IF EXISTS "auth_select_pareceres_pdfs" ON storage.objects;
--   DROP POLICY IF EXISTS "auth_insert_pareceres_pdfs" ON storage.objects;
--   DROP POLICY IF EXISTS "auth_update_pareceres_pdfs" ON storage.objects;
--   DROP POLICY IF EXISTS "auth_delete_pareceres_pdfs" ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'pareceres-pdfs';
--   ALTER TABLE pareceres DROP COLUMN IF EXISTS pdf_path;
-- Backfill necessário: sim, ver scripts/backfill-pareceres-pdf-storage.ts
-- (opcional — só pareceres que já têm `pdf_data_url` preenchido).

INSERT INTO storage.buckets (id, name, public)
VALUES ('pareceres-pdfs', 'pareceres-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_select_pareceres_pdfs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pareceres-pdfs');

CREATE POLICY "auth_insert_pareceres_pdfs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pareceres-pdfs');

CREATE POLICY "auth_update_pareceres_pdfs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pareceres-pdfs');

CREATE POLICY "auth_delete_pareceres_pdfs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pareceres-pdfs');

ALTER TABLE pareceres ADD COLUMN IF NOT EXISTS pdf_path text;

-- ── Verificação (rodar manualmente) ─────────────────────────────────────
-- SELECT * FROM storage.buckets WHERE id = 'pareceres-pdfs';
-- SELECT count(*) FROM pareceres WHERE pdf_path IS NOT NULL;  -- deve dar 0 antes do backfill
