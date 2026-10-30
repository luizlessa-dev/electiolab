-- Curadoria diária pesqele_missing (2026-10-30).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 5 pesquisas confirmadas via imprensa (protocolo TSE batendo, ou instituto+amostra+UF+data
-- exatos). 3 delas (DF-03453, DF-00368, DF-08658/2026) já tinham sido adicionadas em
-- PENDING_POLLS pela rodada de 2026-10-29 (commit 9e961e7) mas SEM migration gerada — esta
-- migration completa o que faltava pra elas saírem de pesqele_missing quando aplicada.
--
-- ⚠️ CONVENÇÃO DA BASE NÃO SEGUIDA NESTAS 5: as migrations anteriores (ver 2026-10-09 a
-- 2026-10-28) estabeleceram que poll_results.percentage deve ser o percentual sobre o TOTAL de
-- entrevistados (incluindo branco/nulo/indeciso/não sabe), não "votos válidos". Para as 5
-- pesquisas abaixo só encontrei (ou a rodada anterior só encontrou) o percentual "dos votos
-- válidos" manchetado pela imprensa — não achei o corte sobre o total pra nenhuma delas.
-- Luiz: considere revisar/corrigir os percentuais antes ou depois de aplicar, ou buscar o
-- corte "sobre o total" nas matérias originais se preferir manter a convenção.
--
-- Itens tentados e descartados nesta rodada (sem matéria confirmando protocolo+percentual):
--   • DF-00402/2026 (Quaest, Governador DF 2º turno, campo até 20/out) — ainda sem matéria,
--     mesmo 10 dias após o campo (3ª tentativa: 10/20, 10/27-ish, 10/30).
--   • DF-08808/2026 (Instituto Veritá, Governador DF 2º turno, campo até 22/out) — nenhuma
--     matéria encontrada citando essa pesquisa específica. Veritá teve pesquisas suspensas pela
--     Justiça Eleitoral por vício metodológico em 2026 — várias nunca chegam a circular.
--   • RJ-07597/2026 (Quaest, Governador RJ 2º turno, campo até 11/out) — nenhuma matéria
--     encontrada (4ª tentativa consecutiva, ver histórico em migrations anteriores).
--   • RJ-02766/2026 (Datafolha, Governador+Senador RJ, campo até 08/out) — nenhuma matéria
--     encontrada pra essa janela de campo específica.
--   • SP-07439/2026, MG-05749/2026, PE-09774/2026 (Datafolha, Governador SP/MG/PE, campo até
--     08/out) — SP, MG e PE não têm eleição de 2º turno para Governador cadastrada (decididas
--     no 1º turno); mantidos fora da curadoria (mesma decisão de rodadas anteriores).
--   • DF-07243/2026 (Datafolha, Governador+Senador DF, campo até 03/out) — achei fonte com
--     Celina Leão 55% / Leandro Grass 27% "dos votos válidos", mas a amostra (1.620) não é
--     confirmada explicitamente na matéria e há divergência de percentual entre fontes
--     secundárias (uma cita ~53% em votos totais) — confiança insuficiente pra casar com
--     certeza com este protocolo específico. Não curado.
--   • GO-00674/2026, PA-04580/2026 (Quaest, Governador GO/PA, campo até 03/out) — nenhuma
--     matéria encontrada confirmando protocolo+percentual pra essas duas UFs dessa rodada.
--
-- ⚠️ NOTA DE PROCESSO: um dos subagentes de pesquisa desta sessão (instruído a SÓ pesquisar,
-- sem editar o repo) editou scripts/ingest-manual.ts e fez commit+push direto pra main por
-- conta própria (commit b37a07d, "cura 2 pesquisas (Datafolha PE, Quaest RS)") — adicionou
-- PE-02404/2026 e RS-08922/2026 em PENDING_POLLS, mas sem gerar a migration correspondente.
-- Esta migration inclui essas 2 pesquisas (verificadas aqui: protocolo/amostra/UF/data batem,
-- candidatos resolvidos sem ambiguidade) pra completar o trabalho, mas o commit em si não foi
-- autorizado por mim nesta sessão — reportado a Luiz pra ele avaliar se quer reverter.
--
-- ⚠️ OUTRA NOTA: PENDING_POLLS em scripts/ingest-manual.ts tem DUAS entradas pro protocolo
-- DF-01738/2026 (Governador DF 2º turno, Datafolha, campo 20-22/out) — uma da migration
-- 20261028120000 (54%/37%, fonte brasildefato, já com migration gerada) e outra adicionada
-- depois pelo commit 9e961e7 (60%/40%, fonte congressoemfoco, sem migration). Como o protocolo
-- já tem migration própria, não repito o insert aqui — Luiz: ao aplicar, considere remover a
-- entrada duplicada/divergente de PENDING_POLLS antes de rodar ingest-manual.ts localmente, pra
-- não tentar inserir a mesma pesquisa duas vezes com percentuais diferentes.

-- ───────────────────────────────────────────────────────────────────────────
-- 1) Datafolha · Governador DF · 2º turno · 23-24 out 2026 · TSE DF-03453/2026 · n=1.620
--    Fonte: https://soubrasilia.com/datafolha-quaest-celina-leao-59-61-por-cento-grass-segundo-turno-df-vespera-24-outubro-2026/
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_df_datafolha_1024 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-24', '2026-10-23', '2026-10-24',
         1620, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://soubrasilia.com/datafolha-quaest-celina-leao-59-61-por-cento-grass-segundo-turno-df-vespera-24-outubro-2026/',
         'DF-03453/2026', true
  from elections e, institutes i
  where e.name = 'Governador DF 2026 - 2º Turno'
    and i.name = 'Datafolha'
    and not exists (
      select 1 from polls p where p.tse_registration = 'DF-03453/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_df_datafolha_1024 np
join elections e on e.id = np.election_id
cross join (values
  ('Celina Leao', 59.0),
  ('Leandro Grass', 41.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 2) Quaest · Governador DF · 2º turno · 23-24 out 2026 · TSE DF-00368/2026 · n=2.652
--    Fonte: https://www.polemicaparaiba.com.br/politica/quaest-no-df-celina-tem-61-dos-votos-validos-contra-39-de-leandro-grass/
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_df_quaest_1024 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-24', '2026-10-23', '2026-10-24',
         2652, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://www.polemicaparaiba.com.br/politica/quaest-no-df-celina-tem-61-dos-votos-validos-contra-39-de-leandro-grass/',
         'DF-00368/2026', true
  from elections e, institutes i
  where e.name = 'Governador DF 2026 - 2º Turno'
    and i.name = 'Quaest'
    and not exists (
      select 1 from polls p where p.tse_registration = 'DF-00368/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_df_quaest_1024 np
join elections e on e.id = np.election_id
cross join (values
  ('Celina Leao', 61.0),
  ('Leandro Grass', 39.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 3) Atlas Intel · Governador DF · 2º turno · 18-23 out 2026 · TSE DF-08658/2026 · n=1.807
--    Fonte: https://www.poder360.com.br/poder-eleicoes-2026/celina-tem-579-dos-votos-validos-e-grass-421-diz-atlasintel/
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_df_atlas_1023 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-24', '2026-10-18', '2026-10-23',
         1807, 2.0, 95, 'online', 'nacional', 'estimulada',
         'https://www.poder360.com.br/poder-eleicoes-2026/celina-tem-579-dos-votos-validos-e-grass-421-diz-atlasintel/',
         'DF-08658/2026', true
  from elections e, institutes i
  where e.name = 'Governador DF 2026 - 2º Turno'
    and i.name = 'Atlas Intel'
    and not exists (
      select 1 from polls p where p.tse_registration = 'DF-08658/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_df_atlas_1023 np
join elections e on e.id = np.election_id
cross join (values
  ('Celina Leao', 57.9),
  ('Leandro Grass', 42.1)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 4) Datafolha · Governador PE · 1º turno · 02-03 out 2026 · TSE PE-02404/2026 · n=1.650
--    Fonte: https://www.diariodepernambuco.com.br/politica/2026/10/11725677-datafolha-raquel-lyra-tem-49-e-joao-campos-48-dos-votos-validos-para-primeiro-turnoo.html
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_pe_datafolha_1003 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-03', '2026-10-02', '2026-10-03',
         1650, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://www.diariodepernambuco.com.br/politica/2026/10/11725677-datafolha-raquel-lyra-tem-49-e-joao-campos-48-dos-votos-validos-para-primeiro-turnoo.html',
         'PE-02404/2026', true
  from elections e, institutes i
  where e.name = 'Governador PE 2026 - 1º Turno'
    and i.name = 'Datafolha'
    and not exists (
      select 1 from polls p where p.tse_registration = 'PE-02404/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_pe_datafolha_1003 np
join elections e on e.id = np.election_id
cross join (values
  ('Raquel Lyra', 49.0),
  ('João Campos', 48.0),
  ('Ivan Moraes', 1.0),
  ('Renan', 1.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 5) Quaest · Governador RS · 1º turno · 02-03 out 2026 · TSE RS-08922/2026 · n=2.004
--    Fonte: https://prensamercosur.org/2026/10/04/quaest-no-rs-zucco-tem-52-dos-votos-validos-e-juliana-brizola-35/
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_rs_quaest_1003 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-03', '2026-10-02', '2026-10-03',
         2004, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://prensamercosur.org/2026/10/04/quaest-no-rs-zucco-tem-52-dos-votos-validos-e-juliana-brizola-35/',
         'RS-08922/2026', true
  from elections e, institutes i
  where e.name = 'Governador RS 2026 - 1º Turno'
    and i.name = 'Quaest'
    and not exists (
      select 1 from polls p where p.tse_registration = 'RS-08922/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_rs_quaest_1003 np
join elections e on e.id = np.election_id
cross join (values
  ('Luciano Zucco', 52.0),
  ('Juliana Brizola', 35.0),
  ('Gabriel Souza', 12.0),
  ('Marcelo Maranata', 1.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;
