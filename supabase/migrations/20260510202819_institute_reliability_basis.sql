-- Adiciona coluna textual com a base do reliability_score
-- (item TODO listado em docs/RELIABILITY-SCORE.md §4).
-- Permite ao usuário/jornalista entender de onde veio o número:
--   "Editorial — sem histórico ainda"
--   "MAE_7d=3.21pp em 5 obs (auto 2026-05-09)"

alter table institutes
  add column if not exists reliability_score_basis text;

comment on column institutes.reliability_score_basis is
  'Texto curto explicando a base do reliability_score (editorial vs auto-calculado). Atualizado por scripts/apply-reliability-phase2.ts.';
