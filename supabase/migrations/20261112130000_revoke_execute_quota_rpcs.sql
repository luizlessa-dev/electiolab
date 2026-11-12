-- ⚠️  APLICAR NO PROJETO ElectioLab (ref xoxztzologqeqbajlhya), NÃO no TF.
--     Arquivo criado como registro (regra do CLAUDE.md): aplicação manual pelo
--     Luiz no SQL Editor. Não aplicada por esta sessão.
--
-- Achado P0 da revisão de arquitetura 2026-09 (seção 2.10): as duas RPCs abaixo
-- são SECURITY DEFINER e tinham EXECUTE para PUBLIC (default do Postgres), logo
-- para anon/authenticated:
--   • recalc_replace_weighted_averages: permitia apagar e substituir médias
--     ponderadas de qualquer eleição anonimamente;
--   • set_custom_quota: permitia auto-conceder quota de API (até 999999).
--
-- Estado em 2026-11-12 (leitura): anon_exec=false, auth_exec=false,
-- service_exec=true nas duas. Ou seja, o revoke já foi aplicado no banco por
-- fora do repo. Este arquivo torna o estado reprodutível e idempotente.
--
-- Pré-requisito já atendido no código: src/app/api/admin/custom-quotas/route.ts
-- chama set_custom_quota via supabaseAdmin (service role).

revoke all on function public.recalc_replace_weighted_averages(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.recalc_replace_weighted_averages(uuid, jsonb)
  to service_role;

revoke all on function public.set_custom_quota(uuid, uuid, integer, text, uuid)
  from public, anon, authenticated;
grant execute on function public.set_custom_quota(uuid, uuid, integer, text, uuid)
  to service_role;
