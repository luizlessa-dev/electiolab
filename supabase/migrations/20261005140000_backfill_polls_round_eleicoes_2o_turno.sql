-- Backfill de polls.round nas elections de 2º turno.
--
-- polls.round tem default 1 e o ingest-manual.ts nunca o preenchia, então pesquisas
-- gravadas em elections com round=2 nasciam com round=1 (133 linhas no momento da
-- auditoria de 05/10/2026: 122 de "Presidencial 2026 - 2º Turno" e 11 de "Presidencial
-- 2022 - 2º Turno"). O ingest passa a gravar round = elections.round; esta migration
-- corrige o histórico.
--
-- Efeito nas médias: nenhum. recalculate-averages, para election.round = 2, usa TODAS as
-- pesquisas da election independentemente de polls.round. O efeito é só em quem filtra
-- polls.round = 2 (histórico bruto da página do 2º turno presidencial).
--
-- NÃO toca nas pesquisas hipotéticas de 2º turno que moram em elections de 1º turno
-- (polls.round = 2 em election round = 1): essas são tratadas por scenario_label.

begin;

update public.polls p
set round = 2
from public.elections e
where e.id = p.election_id
  and e.round = 2
  and p.round is distinct from 2;

commit;

-- Conferência (esperado: 0 linhas):
-- select e.name, count(*) from public.polls p join public.elections e on e.id = p.election_id
-- where e.round = 2 and p.round is distinct from 2 group by 1;
