-- Objetivo: dois ajustes depois da execução real da migration anterior
-- (202609220001), pedidos/achados em 22/09/2026:
--
-- 1) CORREÇÃO: `permissoes_modulo` ficou vazia em produção depois de rodar
--    a 202609220001 (confirmado por `select * from permissoes_modulo;` — 0
--    linhas, mesmo com 2 usuários existentes). O backfill daquela migration
--    devia ter dado ver+editar nos 4 módulos pra quem já existia — não
--    aconteceu (causa não identificada com certeza: script grande colado
--    manualmente no SQL Editor, possível truncamento no copiar/colar ou só
--    parte do script selecionada ao rodar). Não é destrutivo re-rodar esse
--    insert — é idempotente (`ON CONFLICT DO NOTHING`), então roda de novo
--    aqui sem risco mesmo que uma parte tenha ido em produção sem eu saber.
--
-- 2) MUDANÇA DE PADRÃO (pedido do Everton, 22/09/2026): "quero que por
--    padrão venha todos os módulos desbloqueados e apenas eu posso
--    restringir alguns módulos" — inverte a decisão original (usuário novo
--    nascia trancado, admin liberava). Daqui pra frente, toda conta nova
--    já nasce com ver+editar nos 4 módulos atuais — o admin restringe
--    depois pela tela /admin, nunca mais precisa liberar do zero.
--
-- Risco: baixo. Statement 1 é um INSERT idempotente sobre dado já existente
-- (nenhuma linha é sobrescrita, só preenchida se faltando). Statement 2 só
-- troca o corpo de uma função (`CREATE OR REPLACE`), sem tocar dado.

-- ============================================================
-- 1) Backfill de novo — cobre quem já existia e ficou sem permissão
-- ============================================================
insert into permissoes_modulo (user_id, modulo, pode_ver, pode_editar)
select u.id, m.modulo, true, true
from auth.users u
cross join (values ('ocs'), ('pareceres'), ('contratos'), ('opmes')) as m(modulo)
where not exists (
  select 1 from profiles p where p.id = u.id and p.role = 'admin'
)
on conflict (user_id, modulo) do nothing;

-- ============================================================
-- 2) Conta nova nasce com os 4 módulos liberados (ver+editar) —
--    trigger de criação de perfil ganha esse passo extra
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.permissoes_modulo (user_id, modulo, pode_ver, pode_editar)
  select new.id, m.modulo, true, true
  from (values ('ocs'), ('pareceres'), ('contratos'), ('opmes')) as m(modulo)
  on conflict (user_id, modulo) do nothing;

  return new;
end;
$$;

-- ============================================================
-- Queries de verificação (rodar depois, conferir manualmente)
-- ============================================================
-- select count(*) from permissoes_modulo;                       -- deve ser 4 × (nº de usuários não-admin)
-- select p.email, m.modulo, m.pode_ver, m.pode_editar
--   from permissoes_modulo m join profiles p on p.id = m.user_id
--   order by p.email, m.modulo;
