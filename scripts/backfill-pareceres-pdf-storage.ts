// Script de BACKFILL, opcional — criado em 16/09/2026 junto com a migration
// `202609160005_storage_pareceres_pdf.sql` (Hardening, CLAUDE_ENGINEERING.md
// seção 12, "PDF não deve ser armazenado em base64 no Postgres").
//
// A partir deste commit, PDF novo de parecer vai direto pro Supabase Storage
// (bucket `pareceres-pdfs`) via `parecerRepository.uploadPdf` — mas pareceres
// que já tinham um PDF salvo como base64 em `pdf_data_url` (formato antigo)
// continuam funcionando via fallback de leitura (`useAbrirPdfParecer`), sem
// precisar rodar isto. Este script é só pra quem quiser migrar os PDFs
// antigos pro Storage também (destrava o `DROP COLUMN` de `pdf_data_url` no
// futuro, mesmo processo já usado na migração de datas texto→date).
//
// PRÉ-REQUISITOS:
//   VITE_SUPABASE_URL + SUPABASE_KEY (service_role) no `.env` — o bucket
//   `pareceres-pdfs` tem RLS pra usuário autenticado, então a anon key não
//   serve aqui. Rodar a migration `202609160005_storage_pareceres_pdf.sql`
//   ANTES (cria o bucket).
//
// MODO DE USO (sempre rodar sem --apply primeiro, conferir o log):
//   npx tsx scripts/backfill-pareceres-pdf-storage.ts          (dry-run)
//   npx tsx scripts/backfill-pareceres-pdf-storage.ts --apply  (grava de verdade)
//
// Só toca pareceres com `pdf_data_url` preenchido E `pdf_path` ainda vazio —
// nunca sobrescreve um `pdf_path` já existente. NÃO apaga `pdf_data_url`
// depois de migrar (compatibilidade temporária, mesmo padrão da Fase 2 da
// migração de datas) — remover isso é uma etapa futura separada.

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const BUCKET_PDFS = 'pareceres-pdfs'

function env(nome: string): string {
  const valor = process.env[nome]
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida — confira o .env`)
  return valor
}

function decodificarDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) return null
  const [, contentType, base64] = match
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return { bytes, contentType: contentType || 'application/pdf' }
}

async function main() {
  const aplicar = process.argv.includes('--apply')
  const supabase = createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_KEY'))

  const { data: pareceres, error } = await supabase
    .from('pareceres')
    .select('cod, pdf_data_url, pdf_path')
    .not('pdf_data_url', 'is', null)
    .is('pdf_path', null)
  if (error) throw error

  const candidatos = (pareceres ?? []).filter((p) => p.pdf_data_url && p.pdf_data_url.trim() !== '')
  console.log(`Encontrados ${candidatos.length} pareceres com PDF em base64 e sem pdf_path.\n`)

  let migrados = 0
  let erros = 0

  for (const p of candidatos) {
    const decodificado = decodificarDataUrl(p.pdf_data_url as string)
    if (!decodificado) {
      console.log(`⚠ ${p.cod} — pdf_data_url não é um data URL reconhecível, pulando`)
      continue
    }

    const path = `${p.cod}/legado.pdf`
    console.log(`${aplicar ? '✓' : '→'} ${p.cod} — ${decodificado.bytes.length} bytes → ${BUCKET_PDFS}/${path}`)

    if (aplicar) {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_PDFS)
        .upload(path, decodificado.bytes, { contentType: decodificado.contentType, upsert: true })
      if (uploadError) {
        erros++
        console.error(`  ❌ erro no upload de ${p.cod}: ${uploadError.message}`)
        continue
      }
      const { error: updateError } = await supabase.from('pareceres').update({ pdf_path: path }).eq('cod', p.cod)
      if (updateError) {
        erros++
        console.error(`  ❌ erro ao gravar pdf_path de ${p.cod}: ${updateError.message}`)
        continue
      }
    }
    migrados++
  }

  console.log(
    `\n─ Resumo: ${migrados} migrados, ${erros} erros.` + (aplicar ? '' : ' (dry-run — rode com --apply pra gravar de verdade)'),
  )
}

main().catch((err) => {
  console.error('Erro no backfill:', err)
  process.exit(1)
})
