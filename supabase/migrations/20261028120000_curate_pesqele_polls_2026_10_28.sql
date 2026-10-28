-- Curadoria diária pesqele_missing (2026-10-28).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 3 pesquisas confirmadas com fonte de imprensa real (instituto+amostra+janela de campo batendo;
-- protocolo TSE citado explicitamente na matéria para 2 das 3). Convenção desta base: percentual
-- sobre o TOTAL de entrevistados (incluindo branco/nulo/indeciso/não sabe), não "votos válidos" —
-- por isso os números abaixo divergem dos títulos de várias matérias, que manchetam o recorte de
-- válidos.
--
-- As 2 primeiras abaixo (BR-09709/2026, Datafolha; DF-01738/2026 é novo protocolo não visto antes)
-- tinham sido pesquisadas e descartadas por falta de matéria em rodadas anteriores — ver
-- supabase/migrations/20261023120000_curate_pesqele_polls_2026_10_23.sql, linha "Datafolha,
-- BR-09709/2026 ... nenhuma matéria encontrada". A matéria saiu depois (CartaCapital cita o
-- protocolo explicitamente; SBT/O Liberal trazem os percentuais totais 47%/46% da rodada
-- divulgada em 22/out).
--
-- Instituto Veritá BR-03181/2026: protocolo citado explicitamente por Congresso em Foco/Midiamax
-- para a rodada de 19-23/out (divulgada sábado 24/out) — percentual total (49,44%/46,46%)
-- confere matematicamente com o recorte de válidos citado (51,56%/48,44%: 49,44/(49,44+46,46) =
-- 51,57%). Instituto com histórico de pesquisas suspensas pela Justiça Eleitoral em 2026 por vício
-- metodológico — curado normalmente por ter fonte real e protocolo batendo, conforme instrução.
--
-- Itens pesquisados hoje sem confirmação (não curados):
--   • Instituto Veritá, BR-06070/2026 (Presidente, campo 18-22/out, n=15.554, divulgada
--     sexta-feira 23/out) — percentual de VÁLIDOS encontrado (51,3%/48,7%, ex.: ncnews.com.br/
--     ?p=67284) mas nenhuma fonte deu o percentual sobre o TOTAL de entrevistados especificamente
--     para esta rodada (o 49,44%/46,46% encontrado em outra busca bate matematicamente com a
--     rodada seguinte, BR-03181/2026, não com esta) — não estimado a partir dos válidos para não
--     inventar percentual.
--   • GERP BR-09327/2026, Datafolha BR-03112/2026 e BR-09540/2026, PoderData BR-02828/2026, Nexus
--     BR-08234/2026, Quaest DF-00368/2026, AtlasIntel DF-08658/2026 — já pesquisados e descartados
--     na rodada de 2026-10-27 (ver migration correspondente); buscas de hoje não encontraram
--     matéria nova batendo esses protocolos especificamente.
--   • AtlasIntel (8 protocolos, campo até 23/out) e demais protocolos Instituto Veritá da fila —
--     não pesquisados individualmente de novo por orçamento de sessão (tracking diário da
--     AtlasIntel não encontrado com data/amostra específica batendo).

with new_poll_br2t_datafolha_1022 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-22', '2026-10-20', '2026-10-22',
         2520, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://sbtnews.sbt.com.br/noticia/eleicoes/datafolha-flavio-bolsonaro-e-lula-empatam-em-50-no-2-turno',
         'BR-09709/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Datafolha'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-09709/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br2t_datafolha_1022 np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 47.0),
  ('Lula', 46.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

with new_poll_df2t_datafolha_1022 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-22', '2026-10-20', '2026-10-22',
         910, 3.0, 95, 'presencial', 'DF', 'estimulada',
         'https://www.brasildefato.com.br/2026/10/22/datafolha-no-df-celina-leao-tem-54-e-leandro-grass-37-a-tres-dias-do-segundo-turno/',
         'DF-01738/2026', true
  from elections e, institutes i
  where e.name = 'Governador DF 2026 - 2º Turno'
    and i.name = 'Datafolha'
    and not exists (
      select 1 from polls p where p.tse_registration = 'DF-01738/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_df2t_datafolha_1022 np
join elections e on e.id = np.election_id
cross join (values
  ('Celina Leao', 54.0),
  ('Leandro Grass', 37.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

with new_poll_br2t_verita_1024 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, scenario_label, is_verified
  )
  select e.id, i.id, '2026-10-24', '2026-10-19', '2026-10-23',
         15554, 1.0, 95, 'telefonica', 'nacional', 'estimulada',
         'https://midiamax.com.br/politica/2026/pesquisa-verita-traz-flavio-5156-votos-validos-2o-turno-lula-4844/',
         'BR-03181/2026', 'Lula vs Flavio Bolsonaro', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Instituto Veritá'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-03181/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br2t_verita_1024 np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 49.44),
  ('Lula', 46.46)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;
