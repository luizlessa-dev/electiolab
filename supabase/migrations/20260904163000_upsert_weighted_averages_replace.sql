-- O lock (migration anterior) resolve concorrência entre chamadas SEPARADAS,
-- mas não resolve o caso observado: um único disparo do cron_recalculate_averages
-- resultou em DOIS processamentos completos do `?all=true`, 28s de diferença
-- (calculated_at 15:39:08 e 15:39:36 para a mesma linha) — indício de
-- comportamento "at-least-once" da plataforma de edge functions (replay/retry
-- fora do controle da aplicação), não corrida entre chamadas que eu disparei.
-- DELETE-then-INSERT depende de o DELETE enxergar e remover a linha da
-- execução anterior; quando isso falha (por qualquer motivo — já vimos o
-- DELETE simplesmente não achar a linha em alguns casos, mesmo sem erro),
-- sobra duplicata.
--
-- Correção definitiva: trocar por UPSERT com constraint único garantido pelo
-- Postgres — a unicidade passa a ser responsabilidade do índice, não de uma
-- etapa de DELETE que pode falhar silenciosamente ou correr numa ordem
-- inesperada.

-- Limpa as duplicatas do teste de replay acima antes de criar a constraint
-- (senão o CREATE falha por violação de unicidade nos dados existentes).
delete from weighted_averages
where id in (
  select id from (
    select id, row_number() over (
      partition by election_id, candidate_id, scenario_label
      order by calculated_at desc, id desc
    ) as rn
    from weighted_averages
  ) x
  where rn > 1
);

alter table public.weighted_averages
  add constraint weighted_averages_current_key
  unique nulls not distinct (election_id, candidate_id, scenario_label);

create or replace function public.recalc_replace_weighted_averages(
  p_election_id uuid,
  p_rows jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_election_id::text));

  insert into weighted_averages (
    election_id, candidate_id, scenario_label, calculated_at,
    weighted_average, confidence_interval_low, confidence_interval_high,
    polls_included, total_sample_size, calculation_params
  )
  select
    (r->>'election_id')::uuid,
    (r->>'candidate_id')::uuid,
    r->>'scenario_label',
    (r->>'calculated_at')::timestamptz,
    (r->>'weighted_average')::numeric,
    (r->>'confidence_interval_low')::numeric,
    (r->>'confidence_interval_high')::numeric,
    (r->>'polls_included')::integer,
    (r->>'total_sample_size')::integer,
    (r->'calculation_params')::jsonb
  from jsonb_array_elements(p_rows) as r
  on conflict (election_id, candidate_id, scenario_label) do update set
    calculated_at = excluded.calculated_at,
    weighted_average = excluded.weighted_average,
    confidence_interval_low = excluded.confidence_interval_low,
    confidence_interval_high = excluded.confidence_interval_high,
    polls_included = excluded.polls_included,
    total_sample_size = excluded.total_sample_size,
    calculation_params = excluded.calculation_params
  where weighted_averages.calculated_at <= excluded.calculated_at;

  get diagnostics v_count = row_count;

  -- Remove linhas obsoletas: chave (candidato/cenário) que não está mais no
  -- cálculo atual (candidato cuja pesquisa caiu do período, cenário de 2T
  -- sem pesquisa qualificada nesta rodada, etc).
  delete from weighted_averages wa
  where wa.election_id = p_election_id
    and not exists (
      select 1 from jsonb_array_elements(p_rows) as r
      where (r->>'candidate_id')::uuid = wa.candidate_id
        and coalesce(r->>'scenario_label', '') = coalesce(wa.scenario_label, '')
    );

  return v_count;
end;
$$;
