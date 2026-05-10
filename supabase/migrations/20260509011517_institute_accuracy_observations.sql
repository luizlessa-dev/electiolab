-- Fase 1 do roadmap reliability_score (ver docs/RELIABILITY-SCORE.md §3.1).
-- Cria tabela de observações histórico-eleitorais para institutos sem ainda
-- alterar a coluna institutes.reliability_score. Permite que Fases 2/3 calculem
-- MAE pós-eleição automaticamente.

create table if not exists institute_accuracy_observations (
  id uuid primary key default gen_random_uuid(),

  -- Quem foi observado
  institute_id uuid not null references institutes(id) on delete cascade,
  poll_id uuid references polls(id) on delete set null,
  election_id uuid not null references elections(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,

  -- O que ele previu vs o que aconteceu
  poll_published_pct numeric(5, 2) not null,
  actual_pct numeric(5, 2) not null,
  abs_error_pct numeric(5, 2) generated always as (abs(poll_published_pct - actual_pct)) stored,

  -- Janela temporal: dias entre fieldwork_end e o pleito (positivo = antes)
  fieldwork_end_days_before integer not null,
  round integer not null default 1,

  -- Auditoria
  observed_at timestamptz not null default now(),
  observed_via text not null default 'auto', -- 'auto' | 'manual' | 'imported'
  notes text,

  -- Idempotência: uma observação por (instituto, eleição, candidato, dias-antes, turno)
  unique (institute_id, election_id, candidate_id, fieldwork_end_days_before, round)
);

create index institute_accuracy_observations_institute_idx
  on institute_accuracy_observations (institute_id);

create index institute_accuracy_observations_election_idx
  on institute_accuracy_observations (election_id);

create index institute_accuracy_observations_window_idx
  on institute_accuracy_observations (institute_id, fieldwork_end_days_before)
  where fieldwork_end_days_before <= 30;

comment on table institute_accuracy_observations is
  'Histórico de acurácia por instituto, eleição e candidato. Alimentado por job pós-eleição. Base para reliability_score auditável (docs/RELIABILITY-SCORE.md).';

comment on column institute_accuracy_observations.poll_published_pct is
  'Percentual estimado para o candidato no relatório original do instituto.';

comment on column institute_accuracy_observations.actual_pct is
  'Percentual oficial do candidato no resultado do TSE para este turno desta eleição.';

comment on column institute_accuracy_observations.fieldwork_end_days_before is
  'Dias entre fieldwork_end da pesquisa e a data oficial do pleito. Pesquisas >7 dias antes têm peso menor no MAE composto.';

comment on column institute_accuracy_observations.observed_via is
  'auto = job automático pós-eleição; manual = inserção editorial; imported = backfill histórico.';

-- View agregada que vai alimentar a Fase 2 (cálculo do score derivado).
-- Mantida na migration porque é parte do contrato de leitura.
create or replace view institute_accuracy_summary as
select
  i.id as institute_id,
  i.name as institute_name,
  i.slug as institute_slug,
  count(distinct iao.election_id)        as elections_observed,
  count(*)                                as observations_total,
  count(*) filter (where iao.fieldwork_end_days_before <= 7)  as obs_within_7d,
  avg(iao.abs_error_pct)                  as mae_overall,
  avg(iao.abs_error_pct) filter (where iao.fieldwork_end_days_before <= 7) as mae_7d,
  avg(iao.abs_error_pct) filter (where iao.fieldwork_end_days_before <= 14) as mae_14d,
  -- Score sugerido (Fase 2): 1 - MAE_7d/8, clipado [0,1].
  -- Mantém-se ESTÁTICO (não escreve em institutes.reliability_score) até decisão editorial.
  greatest(0::numeric, least(1::numeric,
    1 - (avg(iao.abs_error_pct) filter (where iao.fieldwork_end_days_before <= 7)) / 8
  )) as suggested_reliability_score,
  max(iao.observed_at) as last_observed_at
from institutes i
left join institute_accuracy_observations iao on iao.institute_id = i.id
group by i.id, i.name, i.slug;

comment on view institute_accuracy_summary is
  'Agregado por instituto: contagem de eleições observadas, MAE em janelas de 7/14 dias, e suggested_reliability_score (Fase 2 do roadmap). Não escreve em institutes — leitura editorial.';
