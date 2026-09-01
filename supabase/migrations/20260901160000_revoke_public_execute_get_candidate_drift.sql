-- src/app/api/v1/drift/route.ts foi corrigida pra usar SUPABASE_SERVICE_ROLE_KEY
-- em vez da anon key (commit fc91c70, deploy confirmado em produção em
-- 2026-09-01 — GET /api/v1/drift?candidate_id=... retorna {"data":[],"count":0}
-- sem erro, provando que a service role key está configurada e funcionando).
-- Agora é seguro fechar o último dos 5 SECURITY DEFINER expostos via PostgREST
-- sem querer: só postgres/service_role podem chamar get_candidate_drift.
-- A rota /api/v1/drift continua pública de propósito (authenticate() permite
-- acesso anônimo rate-limited) — isso só fecha o atalho que ignorava esse
-- rate limiting via /rest/v1/rpc/get_candidate_drift direto.

revoke execute on function public.get_candidate_drift(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_candidate_drift(uuid, integer) to postgres, service_role;
