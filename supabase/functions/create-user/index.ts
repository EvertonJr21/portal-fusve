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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401 })
  }

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const jwt = authHeader.replace('Bearer ', '')
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(jwt)
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Sessão inválida.' }), { status: 401 })
  }

  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Só administradores podem criar contas.' }), { status: 403 })
  }

  const { email, password } = await req.json()
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'E-mail e senha são obrigatórios.' }), { status: 400 })
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
    return new Response(JSON.stringify({ error: createError.message }), { status: 400 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
