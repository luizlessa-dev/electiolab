-- View de referência: candidatos oficiais confirmados por estado/cargo,
-- resultado da revisão completa de 2026-09 (27 estados + DF, Senado e
-- Governo). Usar para checar rapidamente contra a base sem precisar
-- reconstruir os filtros de is_active + election toda vez — tanto por
-- humanos curando PENDING_POLLS quanto por outros scripts.
create or replace view candidatos_oficiais_2026 as
select
  e.state,
  e.type as cargo,
  c.name,
  c.full_name,
  c.party,
  c.cpf,
  c.tse_id,
  c.slug,
  c.id as candidate_id,
  e.id as election_id
from candidates c
join elections e on e.id = c.election_id
where e.year = 2026
  and e.type in ('governador', 'senador')
  and c.is_active = true
order by e.state, e.type, c.name;

comment on view candidatos_oficiais_2026 is
  'Roster confirmado (is_active=true) de candidatos a Governador/Senador 2026 por estado, após revisão manual completa de 2026-09. Consultar antes de curar PENDING_POLLS ou investigar um "candidato não resolvido" no ingest-manual.ts.';

grant select on candidatos_oficiais_2026 to anon, authenticated;
