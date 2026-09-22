// Edge Function `delete-user` — nova (22/09/2026, item 46 do backlog),
// pedido do Everton: "preciso de uma possibilidade de eu como admin excluir
// as contas". Deletar uma conta de `auth.users` só dá pra fazer pela API
// de admin do GoTrue (`service_role`), não tem como via RLS/SQL comum —
// mesmo motivo de `create-user` já existir como Edge Function.
//
// `profiles`/`permissoes_modulo` têm `ON DELETE CASCADE` pra
// `auth.users.id`, então somem sozinhas junto. Já `ocs`/`sols`/`pareceres`/
// `contratos`/`opmes.owner_id` (FK sem CASCADE, de propósito) travam a
// exclusão se a conta ainda for dona de algum registro — o Postgres recusa
// com um erro de foreign key, que a function repassa como mensagem
// amigável em vez de deixar estourar cru. Isso evita apagar/orfanizar dado
// de compra real só porque a conta de quem cadastrou foi removida.
//
// Mesmo padrão de autenticação/autorização do `create-user`: exige
// `Authorization` de uma sessão com `profiles.role = 'admin'`.

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
    return json({ error: 'Só administradores podem excluir contas.' }, 403)
  }

  const { userId } = await req.json()
  if (!userId) return json({ error: 'userId é obrigatório.' }, 400)

  if (userId === userData.user.id) {
    return json({ error: 'Você não pode excluir a própria conta por aqui.' }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (deleteError) {
    const foreignKey = /foreign key|violates/i.test(deleteError.message)
    return json(
      {
        error: foreignKey
          ? 'Essa conta ainda tem OCs, Pareceres, Contratos ou OPMEs cadastrados — reatribua ou exclua esses registros antes de remover a conta.'
          : deleteError.message,
      },
      400,
    )
  }

  return json({ ok: true }, 200)
})
