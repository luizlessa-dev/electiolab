-- A RPC anterior (recalc_replace_weighted_averages) já fazia DELETE+INSERT
-- numa única chamada, mas isso só garante atomicidade DENTRO de uma
-- transação — duas chamadas concorrentes pra mesma election_id continuam
-- sendo duas transações Postgres independentes, cada uma com seu próprio
-- DELETE (que não enxerga o INSERT ainda não commitado da outra) seguido de
-- INSERT. Testado e confirmado: 2 chamadas concorrentes pra mesma election
-- ainda produziam 2x linhas (18 ao invés de 9 pra BA governador).
--
-- pg_advisory_xact_lock serializa por election_id: a segunda chamada
-- concorrente espera a primeira COMMITAR antes de rodar seu próprio
-- DELETE+INSERT — nesse ponto ela já enxerga (e remove) as linhas da
-- primeira, convergindo pra um único conjunto de linhas por eleição. O lock
-- é liberado automaticamente no fim da transação (xact), sem precisar de
-- unlock manual nem risco de ficar preso em caso de erro.
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

  delete from weighted_averages where election_id = p_election_id;

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
  from jsonb_array_elements(p_rows) as r;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Limpeza pontual das duplicatas geradas pelo teste de concorrência acima
-- (2026-09-04, antes do lock existir).
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
