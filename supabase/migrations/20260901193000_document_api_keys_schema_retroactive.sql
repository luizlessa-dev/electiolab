-- Migration retroativa (documentação) — fecha o gap da tabela api_keys e da
-- função increment_api_key_usage, criadas direto no banco (commit eb3101d,
-- "ElectioLab v1") sem que o DDL fosse commitado no repo. Todo o corpo é
-- idempotente (IF NOT EXISTS / OR REPLACE): os objetos já existem em
-- produção, isso só sincroniza o histórico local.
--
-- Estado confirmado ao vivo via Supabase MCP em 2026-09-01. A função abaixo
-- já reflete o fix aplicado em produção nesta mesma data (migration remota
-- "fix_increment_api_key_usage_ambiguous_column"): um assinante Pro reportou
-- 500 em toda chamada autenticada de /api/v1/*; a causa era ambiguidade de
-- coluna em PL/pgSQL — `SET requests_used = requests_used + 1` colidia com
-- o parâmetro de saída implícito `requests_used` do RETURNS TABLE, e só
-- disparava no caminho "key válida + dentro do limite" (ou seja, travava
-- toda key Pro real). Corrigido qualificando como `k.requests_used`.

create table if not exists api_keys (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  key_hash        text not null,
  name            text,
  tier            text default 'pro',
  rate_limit      integer default 1000,
  requests_used   integer default 0,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  expires_at      timestamptz,
  period_start    timestamptz not null default now(),
  last_used_at    timestamptz,
  constraint api_keys_key_hash_key unique (key_hash),
  constraint api_keys_user_id_unique unique (user_id),
  constraint api_keys_tier_check check (tier = any (array['pro'::text, 'business'::text, 'enterprise'::text])),
  constraint api_keys_user_id_fkey foreign key (user_id) references auth.users(id)
);

alter table api_keys enable row level security;

do $$ begin
  create policy "Owner read access" on api_keys for select using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $$;

create or replace function public.increment_api_key_usage(p_key_hash text)
 returns table(is_valid boolean, is_over_limit boolean, tier text, rate_limit integer, requests_used integer, requests_remaining integer, user_id uuid, period_resets_at timestamp with time zone)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  k api_keys%rowtype;
  v_period_end timestamptz;
begin
  select * into k from api_keys where key_hash = p_key_hash and is_active = true;
  if not found then
    return query select false, false, null::text, 0, 0, 0, null::uuid, null::timestamptz;
    return;
  end if;

  -- Expiração do período (1 mês a partir de period_start)
  v_period_end := k.period_start + interval '1 month';

  -- Reset se passou do período
  if now() >= v_period_end then
    update api_keys
    set requests_used = 0, period_start = now(), last_used_at = now()
    where id = k.id
    returning * into k;
    v_period_end := k.period_start + interval '1 month';
  end if;

  -- Verifica limite ANTES de incrementar
  if k.requests_used >= k.rate_limit then
    update api_keys set last_used_at = now() where id = k.id;
    return query select true, true, k.tier, k.rate_limit, k.requests_used, 0, k.user_id, v_period_end;
    return;
  end if;

  -- Incrementa (usa k.requests_used, não a coluna bare, que é ambígua com o
  -- OUT param requests_used do RETURNS TABLE — ver nota no topo do arquivo)
  update api_keys
  set requests_used = k.requests_used + 1, last_used_at = now()
  where id = k.id
  returning * into k;

  return query select
    true, false, k.tier, k.rate_limit,
    k.requests_used, greatest(0, k.rate_limit - k.requests_used),
    k.user_id, v_period_end;
end;
$function$;

-- Só postgres/service_role podem chamar — a validação de key passa pelo
-- RPC via supabaseAdmin (service role) em src/lib/api-auth.ts; expor pra
-- anon/authenticated permitiria brute-force de key_hash direto via
-- /rest/v1/rpc/increment_api_key_usage.
revoke execute on function public.increment_api_key_usage(text) from public, anon, authenticated;
grant execute on function public.increment_api_key_usage(text) to postgres, service_role;
