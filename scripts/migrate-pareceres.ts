// Migração única: Firebase Firestore (projeto "parecer-tecnico-huv") → Supabase (tabela `pareceres`).
//
// PRÉ-REQUISITOS:
// 1. A tabela `pareceres` precisa existir no Supabase antes de rodar este script —
//    ver o bloco SQL em CLAUDE.md > "SQL de migração completo". Rode isso no
//    SQL Editor do Supabase primeiro (ainda não foi rodado em produção, confirmado
//    em 2026-08-28 — a tabela não existe hoje).
// 2. Crie um arquivo `.env` (não `.env.local`, esse script roda fora do Vite) na raiz
//    do projeto com:
//      FIREBASE_API_KEY=...
//      FIREBASE_AUTH_DOMAIN=parecer-tecnico-huv.firebaseapp.com
//      FIREBASE_PROJECT_ID=parecer-tecnico-huv
//      VITE_SUPABASE_URL=https://urruseycrvfajnnbupyd.supabase.co
//      SUPABASE_SERVICE_KEY=... (service_role, NÃO a anon key — pegar em
//        Supabase > Project Settings > API > service_role secret)
//    As credenciais do Firebase estão hoje hardcoded em
//    _legacy/parecer/Projeto-Parecer_Fusve-main/js/firebase.js — copie de lá pro
//    .env, não deixe hardcoded em nenhum arquivo versionado.
//
// RODAR: npx tsx scripts/migrate-pareceres.ts
//
// Este script GRAVA na tabela `pareceres` do Supabase de produção real (upsert por
// `cod` — não apaga nada existente, mas sobrescreve registros com o mesmo código).

import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { collection, getDocs, getFirestore } from 'firebase/firestore'
import { createClient } from '@supabase/supabase-js'

function env(nome: string): string {
  const valor = process.env[nome]
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida — confira o .env`)
  return valor
}

async function main() {
  const firebaseApp = initializeApp({
    apiKey: env('FIREBASE_API_KEY'),
    authDomain: env('FIREBASE_AUTH_DOMAIN'),
    projectId: env('FIREBASE_PROJECT_ID'),
  })
  const firestore = getFirestore(firebaseApp)

  const supabase = createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_SERVICE_KEY'))

  console.log('Lendo pareceres do Firestore...')
  const snap = await getDocs(collection(firestore, 'pareceres'))

  const pareceres = snap.docs.map((d) => {
    const data = d.data()
    return {
      cod: d.id,
      nome: data.nome || '',
      cat: data.cat || '',
      padrao: data.padrao || [],
      permitidas: data.permitidas || [],
      restritas: data.restritas || [],
      proibidas: data.proibidas || [],
      observacao: data.observacao || '',
      responsavel: data.responsavel || '',
      data_parecer: data.data_parecer || data.data || '',
      parecer: data.parecer || '',
      pdf_data_url: data.pdf_data_url || data.pdfDataUrl || null,
    }
  })

  console.log(`Encontrados ${pareceres.length} pareceres no Firestore. Gravando no Supabase...`)

  const { error } = await supabase.from('pareceres').upsert(pareceres)
  if (error) throw error

  console.log(`✓ Migrados: ${pareceres.length} pareceres.`)
}

main().catch((err) => {
  console.error('Erro na migração:', err)
  process.exit(1)
})
