-- Curadoria diária pesqele_missing (2026-10-27).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 3 pesquisas confirmadas com fonte de imprensa real (instituto+amostra+janela de campo+protocolo
-- TSE batendo). Convenção desta base: percentual sobre o TOTAL de entrevistados (incluindo
-- branco/nulo/indeciso/não sabe), não "votos válidos" — por isso os números abaixo divergem dos
-- títulos de várias matérias, que manchetam o recorte de válidos.
--
-- Itens priorizados nesta rodada (fila pesqele_missing, 0-30 dias desde o fieldwork, Presidente +
-- Governador de SP/MG/RJ/RS/BA/PR/PE/CE/GO/PA/SC/DF, institutos reputados) e pesquisados sem
-- matéria de imprensa encontrada batendo instituto+amostra+janela de campo+protocolo —
-- descartados por ora, não por suspeita genérica:
--   • GERP, BR-09327/2026 (Presidente, campo até 24/out, n=2.400) — rodadas GERP circulantes na
--     imprensa (16/out e 21/out, ambas já curadas) não batem amostra/data com este protocolo.
--   • Datafolha, BR-03112/2026 (n=1.620) e BR-09540/2026 (n=4.050) (Presidente, campo até 24/out)
--     — rodadas Datafolha circulantes (8/10 n=2520/2250, 15/10 n=2520, 22/10 n=2154) não batem
--     amostra com nenhum dos dois protocolos.
--   • PoderData, BR-02828/2026 (Presidente, campo até 24/out, n=4.000) — rodadas PoderData
--     circulantes têm 2.400/3.000 entrevistados, nunca 4.000; mais recente indexada é de
--     16-18/out (já curada).
--   • Nexus, BR-08234/2026 (Presidente, campo até 24/out, n=2.000) — rodada Nexus mais recente
--     indexada é 16-18/out (BR-04499/2026, n=2.002, já curada); nada para campo até 24/out.
--   • Quaest, DF-00368/2026 (Governador DF 2º turno, campo até 24/out, n=2.652) — rodada Quaest/DF
--     circulante é a de 17-20/out (n=1.104, Celina 50% x Grass 35%); amostra não bate.
--   • AtlasIntel, BR-04062/2026 (Presidente, n=1.800) e DF-08658/2026 (Governador DF 2º turno,
--     n=1.800), ambos campo até 23/out — nenhuma matéria confiável encontrada batendo esses
--     protocolos especificamente (uma fonte para DF-08658 tinha erro evidente no texto — "oito
--     entrevistas foram realizadas" — e não citava registro TSE nem amostra; descartada).
--   • Quaest, RJ-07597/2026 (Governador RJ, campo até 11/out, n=1.302) — rodada Quaest/RJ mais
--     recente encontrada é de 8/set (RJ-04768/2026); nada de outubro para o RJ.
--   • Datafolha, MG-05749/2026 (Governador/Senador MG, campo até 8/out, n=1.204) — rodadas
--     Datafolha/MG encontradas são de 1-3/out (pré-1º turno); nada para campo terminando 8/out.
--   • Datafolha, PE-09774/2026 (Governador PE, campo até 8/out, n=1.204) — rodada Datafolha/PE
--     mais recente encontrada é de 11/set; nada de outubro.
--   • Real Time Big Data, DF-01691/2026 (Governador DF 2º turno, campo até 19/out, n=1.600) — já
--     pesquisada e confirmada (Celina 53% x Grass 37%); NÃO reinserida aqui porque já consta como
--     INSERT pendente em supabase/migrations/20261023120000_curate_pesqele_polls_2026_10_23.sql
--     (ainda não aplicado por Luiz) — evitar duplicidade quando as migrations pendentes forem
--     aplicadas em sequência.
--
-- Não pesquisado individualmente: demais protocolos AtlasIntel/Instituto Veritá da fila (orçamento
-- de sessão) — ficam para a próxima rodada.
with new_poll_br2t_quaest_1024 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-24', '2026-10-23', '2026-10-24',
         3702, null, 95, 'presencial', 'nacional', 'estimulada',
         'https://sbtnews.sbt.com.br/noticia/politica/quaest-flavio-tem-51-e-lula-49-na-vespera-do-2-turno',
         'BR-09158/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Quaest'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-09158/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br2t_quaest_1024 np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 46.0),
  ('Lula', 45.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

with new_poll_br2t_rtbd_1022 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-23', '2026-10-19', '2026-10-22',
         2000, 2.0, 95, 'telefonica', 'nacional', 'estimulada',
         'https://www.dgabc.com.br/Noticia/4354455/flavio-e-lula-mantem-empate-tecnico-95-dizem-ter-voto-definido',
         'BR-09670/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Real Time Big Data'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-09670/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br2t_rtbd_1022 np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 49.0),
  ('Lula', 45.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

with new_poll_br2t_voxbrasil_1022 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-23', '2026-10-20', '2026-10-22',
         2100, 2.15, 95, 'presencial', 'nacional', 'estimulada',
         'https://diariodopara.com.br/eleicoes-2026/vox-lula-tem-506-contra-494-de-flavio-bolsonaro-e-disputa-presidencial-esta-empatada-a-dois-dias-da-eleicao/',
         'BR-03259/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Vox Brasil Pesquisas'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-03259/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br2t_voxbrasil_1022 np
join elections e on e.id = np.election_id
cross join (values
  ('Lula', 45.4),
  ('Flávio Bolsonaro', 44.3)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;
