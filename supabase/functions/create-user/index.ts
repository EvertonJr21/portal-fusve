// Edge Function `create-user` — código versionado aqui pela primeira vez
// (22/09/2026); até então só existia colado no Dashboard (Edge Functions →
// create-user → "Via Editor", ver item 13 do backlog do CLAUDE.md). Everton
// precisa colar este arquivo lá de novo pra aplicar a mudança — não existe
// deploy automático via git pra Edge Functions neste projeto.
//
// Mudança desta versão (22/09/2026, item de permissões/admin): antes
// qualquer usuário autenticado podia chamar essa function e criar conta nova
// — agora só quem tem `profiles.role = 'admin'` pode. O resto do
// comportamento é o mesmo: cria a conta direto (`email_confirm: true`), sem
// mandar e-mail nenhum, sem limite de taxa.
//
// Secrets padrão de toda Edge Function do Supabase (nunca chegam ao
// navegador): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
//
// Bug real corrigido (22/09/2026): a reescrita acima não tratava o preflight
// de CORS (`OPTIONS`, que o navegador manda sozinho antes de todo POST com
// header `Authorization`/`Content-Type: application/json`) — sem uma
// resposta 2xx com `Access-Control-Allow-*` pra esse `OPTIONS`, o navegador
// bloqueia a chamada real antes dela sair, e o app só via um erro genérico
// ("Não foi possível criar o usuário"). Achado via aba Invocations do
// Dashboard: `OPTIONS | 401 | .../create-user` — o código tentava validar
// `Authorization` (que nunca vem num preflight) e caía no 401 de "não
// autenticado" também pro OPTIONS. A versão anterior desta function (nunca
// vista, só documentada em prosa) certamente já tinha esse tratamento.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const jwt = authHeader.replace('Bearer ', '')
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(jwt)
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Sessão inválida.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Só administradores podem criar contas.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { email, password } = await req.json()
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'E-mail e senha são obrigatórios.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
