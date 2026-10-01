-- Curadoria diária pesqele_missing (2026-10-01).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 2 pesquisas confirmadas com fonte de imprensa real (percentuais + protocolo TSE ou
-- instituto+amostra+UF+data batendo exatamente). Resto da fila revisada (~12 itens
-- prioritários) sem confirmação — ver relatório da rotina para detalhes de cada descarte.

-- ───────────────────────────────────────────────────────────────────────────
-- 1) Real Time Big Data · Presidente · 1º turno nacional
--    TSE: BR-09503/2026 (protocolo pesqele BR095032026) · campo 26-30/set/2026 · n=2.000
--    Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-presidente-outubro-2026/
-- ───────────────────────────────────────────────────────────────────────────
with new_poll as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-01', '2026-09-26', '2026-09-30',
         2000, 2.0, 95, 'mista', 'nacional', 'estimulada',
         'https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-presidente-outubro-2026/',
         'BR-09503/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 1º Turno'
    and i.name = 'Real Time Big Data'
    and not exists (
      select 1 from polls p
      where p.election_id = e.id and p.institute_id = i.id and p.fieldwork_end = '2026-09-30'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll np
join elections e on e.id = np.election_id
cross join (values
  ('Lula', 46.0),
  ('Flávio Bolsonaro', 41.0),
  ('Augusto Cury', 5.0),
  ('Caiado', 3.0),
  ('Zema', 1.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 2) Real Time Big Data · Governador RJ · 1º turno
--    TSE: RJ-08712/2026 (protocolo pesqele RJ087122026) · campo 25-29/set/2026 · n=2.000
--    Fonte: https://exame.com/brasil/real-time-big-data-paes-tem-37-e-ruas-31-no-1o-turno-no-rio-de-janeiro/
-- ───────────────────────────────────────────────────────────────────────────
with new_poll as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-09-30', '2026-09-25', '2026-09-29',
         2000, 2.0, 95, 'telefonica', 'nacional', 'estimulada',
         'https://exame.com/brasil/real-time-big-data-paes-tem-37-e-ruas-31-no-1o-turno-no-rio-de-janeiro/',
         'RJ-08712/2026', true
  from elections e, institutes i
  where e.name = 'Governador RJ 2026 - 1º Turno'
    and i.name = 'Real Time Big Data'
    and not exists (
      select 1 from polls p
      where p.election_id = e.id and p.institute_id = i.id and p.fieldwork_end = '2026-09-29'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll np
join elections e on e.id = np.election_id
cross join (values
  ('Eduardo Paes', 37.0),
  ('Douglas Ruas', 31.0),
  ('Anthony Garotinho', 7.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;
