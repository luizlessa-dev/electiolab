-- Curadoria diária pesqele_missing (2026-10-23).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 3 pesquisas confirmadas com fonte de imprensa real (percentual sobre o total de entrevistados +
-- protocolo TSE citado explicitamente na matéria, batendo com instituto+amostra+janela de campo).
-- Convenção desta base: percentual sobre o TOTAL de entrevistados (incluindo branco/nulo/
-- indeciso/não sabe), não "votos válidos" — por isso os números abaixo divergem dos títulos de
-- várias matérias, que manchetam o recorte de válidos.
--
-- As 3 pesquisas abaixo (BR-08535/2026, DF-01691/2026, BR-06396/2026) tinham sido pesquisadas e
-- descartadas na rodada de 2026-10-20 por falta de matéria no momento (ver
-- supabase/migrations/20261020120000_curate_pesqele_polls_2026_10_20.sql) — o campo dessas
-- pesquisas tinha terminado havia poucas horas/dias e a divulgação ainda não tinha saído.
-- Matérias publicadas em 20-21/out confirmam agora instituto+amostra+janela de campo+protocolo
-- TSE batendo.
--
-- Itens priorizados nesta rodada (Presidente + Governador de SP/MG/RJ/RS/BA/PR/PE/CE/GO/PA/SC/DF,
-- institutos reputados) e pesquisados sem matéria de imprensa encontrada batendo
-- instituto+amostra+janela de campo+protocolo — descartados por ora, não por suspeita genérica:
--   • GERP, BR-03835/2026 (Presidente, campo até 20/out, n=2.400) — rodada GERP circulante na
--     imprensa é a de 08-12/out (BR-07877/2026, já curada); sem matéria nova.
--   • PoderData, BR-07926/2026 (Presidente, campo até 21/out, n=4.000) — rodadas PoderData/Aya
--     circulantes na imprensa são de 3.000 entrevistados (5-7/out e 10-12/out, já curadas); não
--     encontrada matéria com amostra de 4.000.
--   • Quaest, BR-03163/2026 (Presidente, campo até 20/out, n=1.104) — mesma amostra atípica
--     (1.104) de uma rodada Quaest/DF já curada (DF-08737/2026, 08-11/out); não encontrada matéria
--     distinta batendo esse protocolo nacional especificamente.
--   • Real Time Mídia, BR-09670/2026 (Presidente, campo até 22/out, n=2.000) — rodada RTBD/
--     Presidente circulante na imprensa mais recente encontrada é de fins de setembro; sem
--     matéria para campo até 22/out.
--   • Vox Brasil, BR-03259/2026 (Presidente, campo até 22/out, n=2.100) — rodada Vox Brasil
--     circulante é a de 15-17/out (BR-04332/2026, já curada); sem matéria para campo até 22/out.
--   • Datafolha, BR-09709/2026 (Presidente, campo até 22/out, n=2.520) e BR-00875/2026 (Presidente,
--     campo até 22/out, n=910) — nenhuma matéria encontrada com Datafolha após a rodada de 03/out
--     (BR-01708/2026, já curada); a rodada Datafolha/DF de 06-07/out (n=910, já curada) é de
--     protocolo diferente.
--   • Quaest, DF-00402/2026 (Governador DF 2º turno, campo até 20/out, n=1.104) — rodada Quaest/DF
--     circulante é a de 08-11/out (DF-08737/2026, já curada); sem matéria nova para campo até
--     20/out.
--   • AtlasIntel, 8 protocolos distintos (BR-08848/2026, BR-04062/2026, BR-00339/2026,
--     BR-06380/2026, BR-09499/2026, BR-05581/2026, BR-00957/2026; Presidente, campo até 23/out,
--     amostras entre 1.200 e 5.000) e DF-08658/2026 (Governador DF 2º turno, campo até 23/out,
--     n=1.800) — a rodada AtlasIntel/Bloomberg mais recente confirmada na imprensa é a de
--     13-18/out (BR-02418/2026, n=4.998, já curada em 2026-10-20); não encontrada matéria
--     batendo os protocolos de campo terminado em 23/out (pesquisa de hoje, pode ainda não ter
--     sido divulgada). Não pesquisado individualmente cada um dos 8 protocolos por orçamento de
--     sessão — fica para a próxima rodada.
--   • Instituto Veritá, 7 protocolos distintos (BR-03181/2026, BR-01214/2026, BR-05827/2026,
--     BR-00442/2026, BR-03826/2026, BR-06070/2026, BR-07691/2026; Presidente, campo até 22-23/out,
--     amostras entre 1.220 e 15.554) — a rodada Veritá confirmada na imprensa é a de 15-19/out
--     (BR-06396/2026, curada abaixo); instituto com histórico de pesquisas suspensas pela Justiça
--     Eleitoral em 2026 por vício metodológico — não curadas por falta de confirmação de imprensa
--     para esses protocolos específicos, não por suspeita genérica contra o instituto. Não
--     pesquisado individualmente cada um dos 7 protocolos por orçamento de sessão.
with new_poll_br2t_quaest as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-21', '2026-10-17', '2026-10-20',
         2154, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://www.poder360.com.br/poder-eleicoes-2026/flavio-tem-45-contra-44-de-lula-no-2o-turno-diz-quaest/',
         'BR-08535/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Quaest'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-08535/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br2t_quaest np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 45.0),
  ('Lula', 44.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

with new_poll_df2t_rtbd as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-20', '2026-10-15', '2026-10-19',
         1600, 2.0, 95, 'telefonica', 'DF', 'estimulada',
         'https://soubrasilia.com/celina-59-grass-41-real-time-big-data-gdf-segundo-turno-df-01691-2026/',
         'DF-01691/2026', true
  from elections e, institutes i
  where e.name = 'Governador DF 2026 - 2º Turno'
    and i.name = 'Real Time Big Data'
    and not exists (
      select 1 from polls p where p.tse_registration = 'DF-01691/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_df2t_rtbd np
join elections e on e.id = np.election_id
cross join (values
  ('Celina Leao', 53.0),
  ('Leandro Grass', 37.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

with new_poll_br2t_verita as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-21', '2026-10-15', '2026-10-19',
         15554, 1.0, 95, 'telefonica', 'nacional', 'estimulada',
         'https://midiamax.com.br/brasil/2026/flavio-bolsonaro-tem-507-intencoes-voto-lula-493-diz-verita/',
         'BR-06396/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Instituto Veritá'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-06396/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br2t_verita np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 50.7),
  ('Lula', 49.3)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;
