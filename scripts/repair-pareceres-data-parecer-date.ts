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
// original, só lido. Se o projeto Firebase ainda existir, os 98 documentos devem
// continuar lá com o campo `data_parecer`/`data` intacto no formato original
// (pode ser string em outro formato, ou um Firestore Timestamp, dependendo de como
// o app antigo gravava — o script trata os dois casos).
//
// PRÉ-REQUISITOS: mesmos do `migrate-pareceres.ts` original —
//   FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID no `.env`.
//   VITE_SUPABASE_URL + SUPABASE_KEY no `.env` — **precisa ser a service_role**
//   agora (diferente da nota antiga no script original): a policy de RLS de
//   `pareceres` hoje exige `auth.role() = 'authenticated'` (item 12/20 do backlog),
//   a anon key não teria permissão de UPDATE.
//
// MODO DE USO (sempre rodar sem --apply primeiro, conferir o log, só depois com --apply):
//   npx tsx scripts/repair-pareceres-data-parecer-date.ts          (dry-run, só mostra o que faria)
//   npx tsx scripts/repair-pareceres-data-parecer-date.ts --apply  (grava de verdade)
//
// O script só faz UPDATE de `data_parecer_date` (nunca mexe em nenhum outro campo),
// e só quando conseguir extrair uma data válida do documento Firestore — nunca
// inventa dado pra um `cod` sem data reconhecível, só loga como "não recuperado".

import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { collection, getDocs, initializeFirestore } from 'firebase/firestore'
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

/** Tenta extrair uma data válida de `DD/MM/AAAA`, `AAAA-MM-DD` ou Firestore Timestamp. */
function extrairData(bruto: unknown): string | null {
  if (bruto == null || bruto === '') return null

  // Firestore Timestamp tem método toDate()
  if (typeof bruto === 'object' && bruto !== null && 'toDate' in bruto && typeof (bruto as { toDate: unknown }).toDate === 'function') {
    const d = (bruto as { toDate: () => Date }).toDate()
    return isNaN(d.getTime()) ? null : paraISO(d)
  }

  if (typeof bruto !== 'string') return null
  const texto = bruto.trim()
  if (!texto) return null

  const matchDMY = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (matchDMY) {
    const [, dd, mm, yyyy] = matchDMY
    return `${yyyy}-${mm}-${dd}`
  }

  const matchISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (matchISO) {
    const [, yyyy, mm, dd] = matchISO
    return `${yyyy}-${mm}-${dd}`
  }

  // Último recurso: deixar o Date nativo tentar interpretar (ex: "5 de janeiro de 2026"
  // não vai funcionar, mas formatos tipo "2026-01-05T00:00:00.000Z" ou "January 5, 2026" sim)
  const tentativa = new Date(texto)
  if (!isNaN(tentativa.getTime())) return paraISO(tentativa)

  return null
}

async function main() {
  const aplicar = process.argv.includes('--apply')

  const firebaseApp = initializeApp({
    apiKey: env('FIREBASE_API_KEY'),
    authDomain: env('FIREBASE_AUTH_DOMAIN'),
    projectId: env('FIREBASE_PROJECT_ID'),
  })
  // experimentalForceLongPolling evita um bug conhecido do transporte gRPC padrão
  // do firebase-js-sdk quando roda em Node fora de um Cloud Function (dispara um
  // erro enganoso "Metadata string value ... contains illegal characters" que não
  // tem relação real com a API key) — confirmado reproduzindo o erro sem esse
  // parâmetro antes de reaplicar o fix.
  const firestore = initializeFirestore(firebaseApp, { experimentalForceLongPolling: true })
  const supabase = createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_KEY'))

  console.log('Lendo pareceres do Firestore...')
  const snap = await getDocs(collection(firestore, 'pareceres'))
  console.log(`Encontrados ${snap.docs.length} documentos no Firestore.\n`)

  let recuperados = 0
  let semData = 0
  let erros = 0

  for (const doc of snap.docs) {
    const cod = doc.id
    const data = doc.data()
    const bruto = data.data_parecer ?? data.data
    const dataISO = extrairData(bruto)

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
