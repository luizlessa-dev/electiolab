-- Curadoria diária pesqele_missing (2026-10-17).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 4 pesquisas confirmadas com fonte de imprensa real (percentual + protocolo TSE batendo, ou
-- instituto+amostra+UF+data batendo exatamente). Convenção desta base: percentual sobre o TOTAL
-- de entrevistados (incluindo branco/nulo/indeciso), não "votos válidos".
--
-- Nota: MG-06705/2026 e SP-09337/2026 já foram curados na migration de 2026-10-14 (ainda não
-- aplicada por Luiz) — por isso continuam aparecendo em pesqele_missing. Não foram re-curados
-- aqui para evitar duplicata.
--
-- Itens revisitados e novamente descartados (já descartados em 2026-10-14, sem matéria nova
-- encontrada nesta rodada): PE-09774/2026, RJ-07597/2026, DF-07243/2026, RJ-01334/2026,
-- PE-02404/2026, RJ-07580/2026, SP-07439/2026.
--
-- Itens pesquisados nesta rodada e descartados por falta de percentual sobre o total de
-- entrevistados (só "votos válidos" circulou na imprensa até agora):
--   • GO-00674/2026 (Quaest, Governador GO, campo 02-03/out, n não confirmado) — Gazeta do Povo/
--     Diário de Goiás só publicaram votos válidos (Vilela 57/Morais 20/Perillo 18); nenhuma
--     fonte com o total bruto.
--   • PA-04580/2026 (Quaest, Governador PA, campo 02-03/out, n=1.800) — Poder360 só trouxe votos
--     válidos (Dr. Daniel 57/Hana 40); um número de "total" (44/31) apareceu em busca mas sem
--     confirmação direta na matéria do O Liberal — não usado por risco de erro.
--
-- Itens pesquisados e descartados por não ter nenhuma pesquisa do instituto/janela batendo:
--   • RS-08922/2026 (Quaest, Governador RS, campo até 03/out, n=2.004) — última rodada Quaest/RS
--     encontrada é de 24/09 (Zucco 29/Brizola 23); nenhuma rodada de 03/out circulou na imprensa.
--
-- Demais ~20 itens da fila (AtlasIntel e Instituto Veritá, campo 01-02/out, diversos estados)
-- não foram pesquisados nesta rodada por orçamento de sessão — seguem na fila para tentativa
-- futura.

-- ───────────────────────────────────────────────────────────────────────────
-- 1) Quaest · Governador BA · 1º turno
--    TSE: BA-02224/2026 (protocolo pesqele BA022242026) · campo 02-03/out/2026 · n=2.004
--    Fonte: https://bahiaeconomica.com.br/wp/2026/10/03/pesquisa-quaest-coloca-jeronimo-e-acm-neto-empatados-mas-governador-seria-reeleito-em-1o-turno/
--    (percentual "dos válidos" também citado: Jerônimo 52/ACM Neto 48 — NÃO usado aqui. Usamos o
--    percentual sobre o total de entrevistados: Jerônimo 46% / ACM Neto 42% / Ronaldo Mansur 1%
--    / branco-nulo 6% / indeciso 5%, que é a convenção desta base.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_ba as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-03', '2026-10-02', '2026-10-03',
         2004, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://bahiaeconomica.com.br/wp/2026/10/03/pesquisa-quaest-coloca-jeronimo-e-acm-neto-empatados-mas-governador-seria-reeleito-em-1o-turno/',
         'BA-02224/2026', true
  from elections e, institutes i
  where e.name = 'Governador BA 2026 - 1º Turno'
    and i.name = 'Quaest'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BA-02224/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_ba np
join elections e on e.id = np.election_id
cross join (values
  ('Jeronimo Rodrigues', 46.0),
  ('ACM Neto', 42.0),
  ('Ronaldo Mansur', 1.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 2) Quaest · Governador Santa Catarina · 1º turno
--    TSE: SC-07346/2026 (protocolo pesqele SC073462026) · campo 02-03/out/2026 · n=1.800
--    Fonte: https://www.nsctotal.com.br/politica/pesquisa-quaest-nsc-jorginho-mello-pl-lidera-com-71-dos-votos-validos-na-vespera-da-eleicao-veja-numeros
--    (percentual "dos válidos" no título: Mello 71/Rodrigues 14/Merísio 12 — NÃO usado aqui.
--    Usamos o percentual sobre o total de entrevistados, citado no corpo da matéria: Jorginho
--    Mello 57% / João Rodrigues 12% / Gelson Merísio 9%, que é a convenção desta base.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_sc as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-03', '2026-10-02', '2026-10-03',
         1800, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://www.nsctotal.com.br/politica/pesquisa-quaest-nsc-jorginho-mello-pl-lidera-com-71-dos-votos-validos-na-vespera-da-eleicao-veja-numeros',
         'SC-07346/2026', true
  from elections e, institutes i
  where e.name = 'Governador Santa Catarina 2026'
    and i.name = 'Quaest'
    and not exists (
      select 1 from polls p where p.tse_registration = 'SC-07346/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_sc np
join elections e on e.id = np.election_id
cross join (values
  ('Jorginho Mello', 57.0),
  ('Joao Rodrigues', 12.0),
  ('Gelson Merisio', 9.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 3) Quaest · Governador Paraná · 1º turno
--    TSE: PR-05119/2026 (protocolo pesqele PR051192026, citado explicitamente na matéria) ·
--    campo 02-03/out/2026 · n=2.004
--    Fonte: https://www.bemparana.com.br/eleicoes-2026/pesquisa-quaest-moro-lidera-com-43-sandro-tem-29-e-requiao-27-para-o-governo-do-parana/
--    (percentual "dos válidos" no título: Moro 43/Sandro Alex 29/Requião 27 — NÃO usado aqui.
--    Usamos o percentual sobre o total de entrevistados, citado no corpo da matéria: Moro 36% /
--    Sandro Alex 25% / Requião Filho 23%, que é a convenção desta base.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_pr as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-03', '2026-10-02', '2026-10-03',
         2004, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://www.bemparana.com.br/eleicoes-2026/pesquisa-quaest-moro-lidera-com-43-sandro-tem-29-e-requiao-27-para-o-governo-do-parana/',
         'PR-05119/2026', true
  from elections e, institutes i
  where e.name = 'Governador Parana 2026'
    and i.name = 'Quaest'
    and not exists (
      select 1 from polls p where p.tse_registration = 'PR-05119/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_pr np
join elections e on e.id = np.election_id
cross join (values
  ('Sergio Moro', 36.0),
  ('Sandro Alex', 25.0),
  ('Requiao Filho', 23.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 4) Quaest · Governador CE · 1º turno
--    TSE: CE-04790/2026 (protocolo pesqele CE047902026, citado explicitamente na matéria) ·
--    campo 02-03/out/2026 · n=2.004
--    Fonte: https://diariodonordeste.verdesmares.com.br/pontopoder/pesquisa-quaest-ceara-elmano-50-e-ciro-49-estao-tecnicamente-empatados-nos-votos-validos--1.3795945
--    (percentual "dos válidos" no título: Elmano 50/Ciro 49 — NÃO usado aqui. Usamos o percentual
--    sobre o total de entrevistados: Elmano 42% / Ciro 41% (branco-nulo 6% + indeciso 10%
--    completam o total), que é a convenção desta base.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_ce as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-03', '2026-10-02', '2026-10-03',
         2004, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://diariodonordeste.verdesmares.com.br/pontopoder/pesquisa-quaest-ceara-elmano-50-e-ciro-49-estao-tecnicamente-empatados-nos-votos-validos--1.3795945',
         'CE-04790/2026', true
  from elections e, institutes i
  where e.name = 'Governador CE 2026 - 1º Turno'
    and i.name = 'Quaest'
    and not exists (
      select 1 from polls p where p.tse_registration = 'CE-04790/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_ce np
join elections e on e.id = np.election_id
cross join (values
  ('Elmano de Freitas', 42.0),
  ('Ciro Gomes', 41.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;
