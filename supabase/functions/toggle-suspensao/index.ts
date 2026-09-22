// Edge Function `toggle-suspensao` — nova (22/09/2026, item 47 do backlog),
// pedido do Everton: alternativa mais segura que excluir de vez uma conta
// (útil pra alguém de férias/licença) — bloqueia login sem apagar nada.
// Usa `ban_duration` nativo do GoTrue (não existe RLS/SQL comum pra isso,
// só API de admin com `service_role`, mesmo motivo de `create-user`/
// `delete-user` já existirem como Edge Function) e espelha o estado em
// `profiles.suspensa` (ver migration `202609220006`) pra UI poder mostrar
// um badge sem outra chamada à API de admin.
//
// Mesmo padrão de autenticação/autorização das outras functions de admin:
// exige `Authorization` de sessão com `profiles.role = 'admin'`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Não autenticado.' }, 401)

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const jwt = authHeader.replace('Bearer ', '')
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(jwt)
  if (userError || !userData.user) return json({ error: 'Sessão inválida.' }, 401)

  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') {
    return json({ error: 'Só administradores podem suspender contas.' }, 403)
  }

  const { userId, suspender } = await req.json()
  if (!userId || typeof suspender !== 'boolean') {
    return json({ error: 'userId e suspender (boolean) são obrigatórios.' }, 400)
  }

  if (userId === userData.user.id) {
    return json({ error: 'Você não pode suspender a própria conta.' }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ~100 anos — GoTrue não aceita "indefinido" de verdade, só uma duração longa.
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: suspender ? '876000h' : 'none',
  })
  if (banError) return json({ error: banError.message }, 400)

  const { error: profileUpdateError } = await supabaseAdmin
    .from('profiles')
    .update({ suspensa: suspender })
    .eq('id', userId)
  if (profileUpdateError) return json({ error: profileUpdateError.message }, 400)

  return json({ ok: true }, 200)
})
