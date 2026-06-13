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
-- dropa a unique key antiga por DESCOBERTA (o nome auto-gerado é truncado em 63
-- chars pelo Postgres → "…scope__key", não "…scope_round_key"). Remove qualquer
-- unique constraint de poll_drafts exceto a nova, sem depender do nome exato.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'poll_drafts'::regclass and contype = 'u'
      and conname <> 'poll_drafts_unique_scenario'
  loop
    execute format('alter table poll_drafts drop constraint %I', c);
  end loop;
end $$;

-- idempotente: se já existir (re-execução / aplicação manual), recria sem erro
alter table poll_drafts
  drop constraint if exists poll_drafts_unique_scenario;

alter table poll_drafts
  add constraint poll_drafts_unique_scenario
  unique nulls not distinct (election_id, institute_name, fieldwork_end, scope, round, scenario_label);

comment on column poll_drafts.scenario_label is
  'Rótulo do cenário (ex.: "Cenário 1 (estimulada)", "sem Zema"). Copiado para polls.scenario_label na promoção.';
