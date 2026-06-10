-- poll_drafts: suportar múltiplos cenários da mesma pesquisa (estimulada A/B/C,
-- 2º turno par-a-par etc.) sem colidir na chave de idempotência.
--
-- Hoje a unique key (election_id, institute_name, fieldwork_end, scope, round)
-- faz os 3 cenários da mesma Quaest/data colapsarem em 1. `polls` já tem
-- scenario_label e NÃO tem constraint bloqueante, então basta carregar o rótulo
-- desde o draft.

alter table poll_drafts add column if not exists scenario_label text;

-- troca a unique key para incluir scenario_label (nulls not distinct: 1T sem
-- cenário continua sendo uma linha só)
alter table poll_drafts
  drop constraint if exists poll_drafts_election_id_institute_name_fieldwork_end_scope_round_key;

alter table poll_drafts
  add constraint poll_drafts_unique_scenario
  unique nulls not distinct (election_id, institute_name, fieldwork_end, scope, round, scenario_label);

comment on column poll_drafts.scenario_label is
  'Rótulo do cenário (ex.: "Cenário 1 (estimulada)", "sem Zema"). Copiado para polls.scenario_label na promoção.';
