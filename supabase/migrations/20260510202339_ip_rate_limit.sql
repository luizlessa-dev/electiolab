-- Rate limit por IP para endpoints públicos não autenticados.
--
-- Escopo: protege POST /api/newsletter/subscribe e similares contra abuso
-- de bots. Endpoints v1 já têm rate limit por API key via api-auth.ts.
--
-- Modelo: bucket por (ip_hash, scope), janela deslizante simples.
--   Cada request incrementa o contador. Quando excede limit dentro de
--   window_seconds, bloqueia até o reset_at.
--
-- ip_hash: SHA-256 do IP (privacidade — não armazenamos IP em claro).
-- scope: identificador da rota (ex.: "newsletter", "stripe").

create table if not exists ip_rate_limits (
  ip_hash text not null,
  scope text not null,
  count int not null default 0,
  window_start timestamptz not null default now(),
  reset_at timestamptz not null default (now() + interval '1 hour'),
  primary key (ip_hash, scope)
);

create index ip_rate_limits_reset_idx on ip_rate_limits (reset_at);

-- RPC: check_ip_rate
-- Retorna true se a request foi permitida (incrementou contador).
-- Retorna false se excedeu o limite.
-- Janela: limite por hora (window_seconds parametrizável).
create or replace function check_ip_rate(
  p_ip_hash text,
  p_scope text,
  p_limit int default 30,
  p_window_seconds int default 3600
) returns table (
  allowed boolean,
  count int,
  remaining int,
  reset_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_row ip_rate_limits%rowtype;
  v_now timestamptz := now();
begin
  -- Tenta atualizar a row existente, expirando janelas vencidas
  select * into v_row from ip_rate_limits
    where ip_hash = p_ip_hash and scope = p_scope
    for update;

  if not found or v_row.reset_at <= v_now then
    -- Nova janela
    insert into ip_rate_limits (ip_hash, scope, count, window_start, reset_at)
      values (p_ip_hash, p_scope, 1, v_now, v_now + (p_window_seconds || ' seconds')::interval)
    on conflict (ip_hash, scope) do update
      set count = 1,
          window_start = v_now,
          reset_at = v_now + (p_window_seconds || ' seconds')::interval
    returning * into v_row;
    return query select true, v_row.count, p_limit - v_row.count, v_row.reset_at;
    return;
  end if;

  -- Janela ativa: checa se já excedeu
  if v_row.count >= p_limit then
    return query select false, v_row.count, 0, v_row.reset_at;
    return;
  end if;

  -- Incrementa
  update ip_rate_limits set count = count + 1
    where ip_hash = p_ip_hash and scope = p_scope
    returning * into v_row;
  return query select true, v_row.count, p_limit - v_row.count, v_row.reset_at;
end;
$$;

comment on function check_ip_rate is
  'Rate limit por IP+scope. Retorna allowed=false quando excede p_limit em p_window_seconds. Use SHA-256 do IP em ip_hash para preservar privacidade.';

-- Cleanup automático: rows com reset_at vencido > 24h são lixo.
-- Não cria cron aqui (depende do Supabase pg_cron); apenas RPC manual.
create or replace function cleanup_expired_ip_rate_limits()
returns int
language sql
as $$
  with deleted as (
    delete from ip_rate_limits where reset_at < now() - interval '24 hours' returning 1
  )
  select count(*)::int from deleted;
$$;
