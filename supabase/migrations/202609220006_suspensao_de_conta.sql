-- Objetivo: suporte pra "suspender conta" (item 47 do backlog) — alternativa
-- mais segura que excluir de vez: a conta para de conseguir logar, mas os
-- dados dela continuam intactos (útil pra alguém de férias/licença, sem
-- perder histórico nem esbarrar no bloqueio de FK que `delete-user` tem
-- quando a conta ainda é dona de algum registro).
--
-- `auth.users` já tem `banned_until` nativo do GoTrue (usado pela Edge
-- Function `toggle-suspensao` pra bloquear login de verdade), mas essa
-- coluna não é visível/consultável pela RLS normal do app — só via API de
-- admin. Espelhamos o estado em `profiles.suspensa` (atualizada pela mesma
-- function, com `service_role`) só pra poder mostrar um badge na tela
-- /admin sem precisar de outra chamada à API de admin toda vez que a lista
-- carrega.
--
-- Risco: baixo — só ADD COLUMN aditiva, default `false`, nenhum dado tocado.

alter table profiles add column if not exists suspensa boolean not null default false;
