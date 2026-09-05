// Migração única: src/data/marcasSugeridas.json (estático) → Supabase (tabela `marcas_sugeridas`).
//
// PRÉ-REQUISITOS:
// 1. Criar a tabela no Supabase antes de rodar este script (SQL Editor):
//
//   CREATE TABLE IF NOT EXISTS marcas_sugeridas (
//     cat        text PRIMARY KEY,
//     marcas     text[] NOT NULL DEFAULT '{}',
//     updated_at timestamptz DEFAULT now()
//   );
//   ALTER TABLE marcas_sugeridas ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "auth_marcas_sugeridas" ON marcas_sugeridas
//     FOR ALL USING (auth.role() = 'authenticated');
//
// 2. Criar um arquivo `.env` (não `.env.local`, esse script roda fora do Vite) com:
//      VITE_SUPABASE_URL=https://urruseycrvfajnnbupyd.supabase.co
//      SUPABASE_KEY=... (precisa ser a service_role — Project Settings > API >
//        service_role secret — porque a RLS de `marcas_sugeridas` exige usuário
//        autenticado, e este script roda fora de uma sessão logada)
//
// RODAR: npx tsx scripts/migrate-marcas-sugeridas.ts
//
// Idempotente — upsert por `cat`, pode rodar de novo sem duplicar.

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { MARCAS_SUGERIDAS } from '../src/data/marcasSugeridas'

function env(nome: string): string {
  const valor = process.env[nome]
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida — confira o .env`)
  return valor
}

async function main() {
  const supabase = createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_KEY'))

  const rows = Object.entries(MARCAS_SUGERIDAS).map(([cat, marcas]) => ({ cat, marcas }))
  console.log(`Gravando ${rows.length} categorias em marcas_sugeridas...`)

  const { error } = await supabase.from('marcas_sugeridas').upsert(rows)
  if (error) throw error

  console.log(`✓ Migrados: ${rows.length} categorias.`)
}

main().catch((err) => {
  console.error('Erro na migração:', err)
  process.exit(1)
})
