-- Fix: institute_accuracy_summary contava 1 observação para institutos
-- sem dados (count(*) sobre LEFT JOIN). Substitui por count(iao.id) que
-- ignora linhas NULL.

create or replace view institute_accuracy_summary as
select
  i.id as institute_id,
  i.name as institute_name,
  i.slug as institute_slug,
  count(distinct iao.election_id)        as elections_observed,
  count(iao.id)                           as observations_total,
  count(iao.id) filter (where iao.fieldwork_end_days_before <= 7)  as obs_within_7d,
  avg(iao.abs_error_pct)                  as mae_overall,
  avg(iao.abs_error_pct) filter (where iao.fieldwork_end_days_before <= 7) as mae_7d,
  avg(iao.abs_error_pct) filter (where iao.fieldwork_end_days_before <= 14) as mae_14d,
  -- suggested_reliability_score só faz sentido com >=3 obs em 7d (Fase 2 do roadmap).
  -- Senão, NULL → cliente cai no fallback editorial.
  case when count(iao.id) filter (where iao.fieldwork_end_days_before <= 7) >= 3
    then greatest(0::numeric, least(1::numeric,
      1 - (avg(iao.abs_error_pct) filter (where iao.fieldwork_end_days_before <= 7)) / 8
    ))
    else null
  end as suggested_reliability_score,
  max(iao.observed_at) as last_observed_at
from institutes i
left join institute_accuracy_observations iao on iao.institute_id = i.id
group by i.id, i.name, i.slug;

comment on view institute_accuracy_summary is
  'Agregado por instituto. count(iao.id) ignora NULLs do LEFT JOIN; suggested_reliability_score só não-nulo com >=3 observações em 7d.';
