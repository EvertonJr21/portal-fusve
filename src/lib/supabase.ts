import { createClient } from '@supabase/supabase-js'
// import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes — confira o .env.local (veja .env.example).',
  )
}

// TODO: trocar por `createClient<Database>` assim que `src/types/database.ts`
// for gerado com `supabase gen types typescript`.
export const supabase = createClient(url, anonKey)
