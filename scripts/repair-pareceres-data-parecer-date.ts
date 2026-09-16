// Script de REPARO, não é a migração original — criado em 16/09/2026 depois de um
// incidente: o backfill da Fase 1 da migração de datas texto→date (ver CLAUDE.md,
// "Migração de Datas Texto → Date") não converteu NENHUM dos 98 `pareceres` pra
// `data_parecer_date`, porque o texto migrado do Firebase não batia o formato
// `DD/MM/AAAA` esperado por `to_date()`. Quando a coluna texto `data_parecer` foi
// removida (`202609160004_remove_colunas_texto_datas.sql`), a data original ficou
// sem nenhuma fonte na tabela `pareceres` do Supabase.
//
// Este script busca o valor original direto na fonte de verdade — o Firestore do
// projeto Firebase `parecer-tecnico-huv`, coleção `pareceres` (a mesma fonte de
// `scripts/migrate-pareceres.ts`) — que NUNCA foi apagado ou alterado pela migração
// original, só lido.
//
// Usa a Firestore REST API v1 direto via `fetch`, em vez do SDK `firebase/firestore`
// (`initializeApp`/`getDocs`) usado no script original: o SDK abre um canal gRPC
// de "listen" por baixo dos panos mesmo em leituras únicas, e isso quebra de forma
// consistente em ambientes tipo Codespaces com um erro enganoso ("Metadata string
// value ... contains illegal characters", sem relação real com a API key) — tanto
// com o transporte padrão quanto com `experimentalForceLongPolling`. A REST API é
// só HTTP puro, sem esse problema.
//
// PRÉ-REQUISITOS:
//   FIREBASE_API_KEY, FIREBASE_PROJECT_ID no `.env` (FIREBASE_AUTH_DOMAIN não é
//   necessário pra REST API, mas não tem problema deixar no `.env` se já estiver lá).
//   VITE_SUPABASE_URL + SUPABASE_KEY no `.env` — precisa ser a **service_role**
//   (a policy de RLS de `pareceres` hoje exige `auth.role() = 'authenticated'`,
//   a anon key não teria permissão de UPDATE).
//
// MODO DE USO (sempre rodar sem --apply primeiro, conferir o log, só depois com --apply):
//   npx tsx scripts/repair-pareceres-data-parecer-date.ts          (dry-run, só mostra o que faria)
//   npx tsx scripts/repair-pareceres-data-parecer-date.ts --apply  (grava de verdade)
//
// O script só faz UPDATE de `data_parecer_date` (nunca mexe em nenhum outro campo),
// e só quando conseguir extrair uma data válida do documento Firestore — nunca
// inventa dado pra um `cod` sem data reconhecível, só loga como "não recuperado".

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function env(nome: string): string {
  const valor = process.env[nome]
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida — confira o .env`)
  return valor
}

/** `Date` → `YYYY-MM-DD` (formato aceito pela coluna `date` nativa do Postgres). */
function paraISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Tenta extrair uma data válida de `DD/MM/AAAA`, `AAAA-MM-DD` ou qualquer string que o `Date` nativo reconheça. */
function extrairDataDeTexto(texto: string): string | null {
  const t = texto.trim()
  if (!t) return null

  const matchDMY = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (matchDMY) {
    const [, dd, mm, yyyy] = matchDMY
    return `${yyyy}-${mm}-${dd}`
  }

  const matchISO = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (matchISO) {
    const [, yyyy, mm, dd] = matchISO
    return `${yyyy}-${mm}-${dd}`
  }

  const tentativa = new Date(t)
  return isNaN(tentativa.getTime()) ? null : paraISO(tentativa)
}

/** Valor de campo no formato REST do Firestore (`{ stringValue: ... }`, `{ timestampValue: ... }`, etc). */
type CampoFirestore = { stringValue?: string; timestampValue?: string; integerValue?: string; nullValue?: null }

function extrairDataDeCampo(campo: CampoFirestore | undefined): { bruto: unknown; iso: string | null } {
  if (!campo) return { bruto: undefined, iso: null }
  if (campo.stringValue !== undefined) return { bruto: campo.stringValue, iso: extrairDataDeTexto(campo.stringValue) }
  if (campo.timestampValue !== undefined) {
    const d = new Date(campo.timestampValue)
    return { bruto: campo.timestampValue, iso: isNaN(d.getTime()) ? null : paraISO(d) }
  }
  return { bruto: campo, iso: null }
}

interface DocumentoFirestore {
  name: string
  fields?: Record<string, CampoFirestore>
}

async function buscarTodosDocumentos(projectId: string, apiKey: string): Promise<DocumentoFirestore[]> {
  const documentos: DocumentoFirestore[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/pareceres`)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('pageSize', '300')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url)
    if (!res.ok) {
      const corpo = await res.text()
      throw new Error(`Firestore REST API retornou ${res.status}: ${corpo}`)
    }
    const json = (await res.json()) as { documents?: DocumentoFirestore[]; nextPageToken?: string }
    documentos.push(...(json.documents ?? []))
    pageToken = json.nextPageToken
  } while (pageToken)

  return documentos
}

async function main() {
  const aplicar = process.argv.includes('--apply')

  const apiKey = env('FIREBASE_API_KEY')
  const projectId = env('FIREBASE_PROJECT_ID')
  const supabase = createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_KEY'))

  console.log('Lendo pareceres do Firestore (REST API)...')
  const documentos = await buscarTodosDocumentos(projectId, apiKey)
  console.log(`Encontrados ${documentos.length} documentos no Firestore.\n`)

  let recuperados = 0
  let semData = 0
  let erros = 0

  for (const doc of documentos) {
    const cod = doc.name.split('/').pop() ?? '?'
    const fields = doc.fields ?? {}
    let { bruto, iso: dataISO } = extrairDataDeCampo(fields.data_parecer)
    if (!dataISO) ({ bruto, iso: dataISO } = extrairDataDeCampo(fields.data))

    if (!dataISO) {
      semData++
      console.log(`⚠ ${cod} — sem data recuperável (valor bruto: ${JSON.stringify(bruto)})`)
      continue
    }

    console.log(`${aplicar ? '✓' : '→'} ${cod} — ${JSON.stringify(bruto)} → ${dataISO}`)

    if (aplicar) {
      const { error } = await supabase.from('pareceres').update({ data_parecer_date: dataISO }).eq('cod', cod)
      if (error) {
        erros++
        console.error(`  ❌ erro ao gravar ${cod}: ${error.message}`)
        continue
      }
    }
    recuperados++
  }

  console.log(
    `\n─ Resumo: ${recuperados} recuperados, ${semData} sem data no Firestore, ${erros} erros de gravação.` +
      (aplicar ? '' : ' (dry-run — rode com --apply pra gravar de verdade)'),
  )
}

main().catch((err) => {
  console.error('Erro no reparo:', err)
  process.exit(1)
})
