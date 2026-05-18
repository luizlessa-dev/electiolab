-- 2T armazena uma linha por (candidato × cenário), então Lula aparece em
-- N linhas no mesmo calculated_at (uma por par "lula-vs-X"). A unique key
-- antiga (election_id, candidate_id, calculated_at) bloqueava esses inserts
-- com duplicate key violation.
--
-- Substitui pela chave que inclui scenario_label. Em 1T, scenario_label é
-- NULL — usamos NULLS NOT DISTINCT (Postgres 15+) pra que dois NULLs sejam
-- tratados como iguais, preservando a unicidade em 1T.

alter table weighted_averages
  drop constraint if exists weighted_averages_election_id_candidate_id_calculated_at_key;

alter table weighted_averages
  add constraint weighted_averages_unique_scenario
  unique nulls not distinct (election_id, candidate_id, scenario_label, calculated_at);
