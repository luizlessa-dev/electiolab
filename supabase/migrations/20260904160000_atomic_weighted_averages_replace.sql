-- weighted_averages tinha até 66% de linhas duplicadas/obsoletas acumuladas:
-- o padrão delete-then-insert do recalculate-averages é DUAS chamadas HTTP
-- separadas via PostgREST (sem transação entre elas), então qualquer disparo
-- concorrente pra mesma election_id (reprocessamento manual, retry, etc.)
-- corre risco de um DELETE de uma execução rodar depois do INSERT de outra,
-- deixando linha órfã pra trás. Move o replace inteiro pra dentro de uma
-- única transação no banco, eliminando a janela de corrida.
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

grant execute on function public.recalc_replace_weighted_averages(uuid, jsonb) to service_role;

-- Limpeza pontual: remove as duplicatas já acumuladas (mantém só a linha
-- mais recente por election_id+candidate_id+scenario_label). Rodada uma vez
-- manualmente em 2026-09-03; registrada aqui pra ficar no histórico de
-- migrations em vez de só ter acontecido via SQL ad-hoc.
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
