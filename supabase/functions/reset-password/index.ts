// Edge Function `reset-password` — nova (22/09/2026, item 47 do backlog),
// pedido do Everton: admin poder redefinir a senha de um usuário direto,
// sem depender do fluxo de e-mail (`resetPasswordForEmail`) — o servidor de
// e-mail compartilhado do Supabase já esbarrou em rate limit nesse projeto
// antes (item 13 do backlog, tentativa de convite por e-mail). Mesma ideia
// de `create-user`, que também já define a senha direto sem mandar e-mail.
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
    return json({ error: 'Só administradores podem redefinir senha de outra conta.' }, 403)
  }

  const { userId, newPassword } = await req.json()
  if (!userId || !newPassword) {
    return json({ error: 'userId e newPassword são obrigatórios.' }, 400)
  }
  if (newPassword.length < 8) {
    return json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })
  if (updateError) return json({ error: updateError.message }, 400)

  return json({ ok: true }, 200)
})
