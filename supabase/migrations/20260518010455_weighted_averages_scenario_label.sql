-- 2T tem cenários pareados: "Lula × Flávio", "Lula × Zema", etc.
-- Cada cenário é uma pergunta independente, não pode ser agregado num número único.
--
-- Adiciona scenario_label para distinguir cenários em weighted_averages.
-- NULL = 1T (sem cenários, modo agregado clássico).
-- Não-NULL = 2T por cenário (ex: "caiado-vs-lula").
--
-- Formato canônico: slugs ordenados alfabeticamente joined por "-vs-",
-- gerado pela Edge Function recalculate-averages.

alter table weighted_averages add column if not exists scenario_label text;

-- Índice composto para queries por cenário em uma eleição
create index if not exists weighted_averages_election_scenario_idx
  on weighted_averages (election_id, scenario_label)
  where scenario_label is not null;

comment on column weighted_averages.scenario_label is
  'Identifica o par de candidatos em cenários 2T (ex: "lula-vs-zema"). NULL em 1T.';
