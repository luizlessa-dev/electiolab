-- Remove a eleição duplicada "Eleições Presidenciais 2026" (1º turno).
--
-- Criada em 2026-09-29 por scripts/create-election-presidente.ts, sem
-- election_date/tse_id. As eleições canônicas são:
--   21f8e9a3-5ff8-4baf-b0ae-6b00d2614248  Presidencial 2026 - 1º Turno
--   cd7032c5-06ed-4eb9-8702-ddd6c75d83de  Presidencial 2026 - 2º Turno
--
-- Verificado em 2026-10-03: 0 linhas referenciando este id em todas as FKs
-- para elections (polls, candidates, weighted_averages, institute_accuracy,
-- campaign_finances, digital_ads, election_results, user_alerts,
-- institute_accuracy_observations, poll_drafts, tse_apuracao, news_item_links,
-- apuracao.disputa). Portanto o DELETE não cascateia nem é bloqueado.
--
-- A guarda de NOT EXISTS faz a migration abortar sem apagar nada se alguma
-- pesquisa/candidato tiver sido vinculado nesse meio tempo.

delete from public.elections e
where e.id = '7c61acc8-35cd-499c-bfef-a56d08bbea49'
  and e.name = U&'Elei\00e7\00f5es Presidenciais 2026'  -- "Eleições", escapado: imune a locale/pbcopy
  and not exists (select 1 from public.polls p where p.election_id = e.id)
  and not exists (select 1 from public.candidates c where c.election_id = e.id)
  and not exists (select 1 from public.election_results r where r.election_id = e.id);
