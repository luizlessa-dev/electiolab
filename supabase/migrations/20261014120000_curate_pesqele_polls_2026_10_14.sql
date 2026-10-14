-- Curadoria diária pesqele_missing (2026-10-14).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 3 pesquisas confirmadas com fonte de imprensa real (percentual + protocolo TSE batendo, ou
-- institudo+amostra+UF+data batendo exatamente). Convenção desta base: percentual sobre o TOTAL
-- de entrevistados (incluindo branco/nulo/indeciso), não "votos válidos" — ver nota na migration
-- de 2026-10-10 sobre o erro cometido naquela rodada.
--
-- 11 outros itens prioritários da fila foram pesquisados e descartados (nenhuma matéria de
-- imprensa encontrada citando protocolo/percentual para a janela de campo específica do
-- registro TSE): PE-09774/2026 (Datafolha, Governador PE, campo até 08/out) · RJ-07597/2026
-- (Quaest, Governador RJ, campo até 11/out) · DF-07243/2026, RJ-01334/2026, PE-02404/2026
-- (Datafolha, Governador DF/RJ/PE, campo 02-03/out — tentei casar com a "última rodada"
-- Datafolha de 5 estados+DF do dia 03/out, mas os protocolos TSE citados nas matérias
-- encontradas para RJ e PE dessa rodada são outros, RJ-02070/2026 e sem confirmação para PE;
-- SP e MG dessa mesma rodada BATERAM exatamente — ver itens confirmados abaixo) · BA-02224/2026,
-- RS-08922/2026, GO-00674/2026, PR-05119/2026 (Quaest, Governador BA/RS/GO/PR, campo
-- 02-03/out) · RJ-07580/2026 (GERP, Governador RJ) · SP-07439/2026 (Datafolha, Governador SP,
-- campo até 08/out) — nenhuma pesquisa Quaest/GERP para esses estados nem Datafolha SP/PE de
-- 08/out apareceu na imprensa; parecem não ter circulado ainda. Seguem na fila para tentativa
-- futura.

-- ───────────────────────────────────────────────────────────────────────────
-- 1) Datafolha · Governador MG · 1º turno
--    TSE: MG-06705/2026 (protocolo pesqele MG067052026) · campo 02-03/out/2026 · n=2010
--    Fonte: https://www.dgabc.com.br/Noticia/4350632/em-minas-cleitinho-lidera-com-53-dos-votos-validos-diz-datafolha-patrus-tem-21-e-kalil-9
--    (percentual "dos válidos" no título: Cleitinho 53/Patrus 21/Kalil 9 — NÃO usado aqui.
--    Usamos o percentual sobre o total de entrevistados, citado no corpo da matéria/cobertura
--    equivalente: Cleitinho 44% / Patrus 18% / Kalil 8%, que é a convenção desta base.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_mg as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-03', '2026-10-02', '2026-10-03',
         2010, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://www.dgabc.com.br/Noticia/4350632/em-minas-cleitinho-lidera-com-53-dos-votos-validos-diz-datafolha-patrus-tem-21-e-kalil-9',
         'MG-06705/2026', true
  from elections e, institutes i
  where e.name = 'Governador MG 2026 - 1º Turno'
    and i.name = 'Datafolha'
    and not exists (
      select 1 from polls p where p.tse_registration = 'MG-06705/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_mg np
join elections e on e.id = np.election_id
cross join (values
  ('Cleitinho', 44.0),
  ('Patrus Ananias', 18.0),
  ('Alexandre Kalil', 8.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 2) Datafolha · Governador SP · 1º turno
--    TSE: SP-09337/2026 (protocolo pesqele SP093372026) · campo 02-03/out/2026 · n=2520
--    Fonte: https://tribunadejundiai.com.br/politica/eleicoes-2026/datafolha-tarcisio-tem-60-dos-votos-validos-e-haddad-35-em-sao-paulo/
--    (percentual "dos válidos" no título: Tarcísio 60/Haddad 35 — NÃO usado aqui. Usamos o
--    percentual sobre o total de entrevistados, citado no corpo da matéria: Tarcísio 55% /
--    Haddad 32%, que é a convenção desta base.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_sp as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-03', '2026-10-02', '2026-10-03',
         2520, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://tribunadejundiai.com.br/politica/eleicoes-2026/datafolha-tarcisio-tem-60-dos-votos-validos-e-haddad-35-em-sao-paulo/',
         'SP-09337/2026', true
  from elections e, institutes i
  where e.name = 'Governador SP 2026 - 1º Turno'
    and i.name = 'Datafolha'
    and not exists (
      select 1 from polls p where p.tse_registration = 'SP-09337/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_sp np
join elections e on e.id = np.election_id
cross join (values
  ('Tarcísio', 55.0),
  ('Haddad', 32.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 3) Quaest · Governador DF · 2º turno
--    TSE: DF-08737/2026 (protocolo pesqele DF087372026) · campo 08-11/out/2026 · n=1104
--    Protocolo TSE não citado nas matérias encontradas; casamento por instituto+amostra+UF+data
--    exato (1.104 entrevistados, 08 a 11/out, Quaest, DF, única rodada Quaest nessa janela).
--    Fonte: https://sbtnews.sbt.com.br/noticia/politica/quaest-df-celina-leao-tem-53-e-leandro-grass-33
--    Percentual já é sobre o total de entrevistados (53% Celina + 33% Grass + 8% branco/nulo +
--    6% indeciso = 100%), convenção desta base.
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_df as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-12', '2026-10-08', '2026-10-11',
         1104, 3.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://sbtnews.sbt.com.br/noticia/politica/quaest-df-celina-leao-tem-53-e-leandro-grass-33',
         'DF-08737/2026', true
  from elections e, institutes i
  where e.name = 'Governador DF 2026 - 2º Turno'
    and i.name = 'Quaest'
    and not exists (
      select 1 from polls p where p.tse_registration = 'DF-08737/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_df np
join elections e on e.id = np.election_id
cross join (values
  ('Celina Leao', 53.0),
  ('Leandro Grass', 33.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;
