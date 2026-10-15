-- Curadoria diária pesqele_missing (2026-10-15).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 2 pesquisas confirmadas com fonte de imprensa real (percentual + protocolo TSE batendo).
-- Convenção desta base: percentual sobre o TOTAL de entrevistados (incluindo branco/nulo/
-- indeciso), não "votos válidos" — ver nota na migration de 2026-10-10.
--
-- Nota: DF-08737/2026 (Quaest, Governador DF 2º turno) JÁ foi curado na migration de
-- 2026-10-14 (ainda não aplicada por Luiz) — por isso continua aparecendo em pesqele_missing.
-- Não foi re-curado aqui para evitar duplicata.
--
-- 16 outros itens priorizados da fila foram pesquisados e descartados (nenhuma matéria de
-- imprensa encontrada citando protocolo/percentual para a janela de campo específica do
-- registro TSE): BR-00466/2026 (Datafolha, Presidente, campo até 15/out, n=2.520 — nenhuma
-- rodada nacional Datafolha de 15/out encontrada, só a de set/pré-1ºturno) · BR-06662/2026
-- (Instituto Veritá, Presidente, campo até 15/out, n=40.500 — nenhuma pesquisa Veritá de
-- outubro/2026 encontrada; instituto teve rodadas suspensas pela Justiça Eleitoral em 2026 e
-- parte não circula) · BR-04258/2026 e BR-01209/2026 (PoderData, Presidente, n=3.000, campo
-- até 15/out e 12/out — última rodada PoderData encontrada é 30/set-02/out com n=4.000,
-- não bate) · BR-08771/2026 (Vox Brasil, Presidente, campo até 15/out, n=2.100 — Vox Brasil
-- tem rodada de 05-07/out com mesma amostra mas registrada sob OUTRO protocolo,
-- BR-09623/2026; não bate) · BR-01093/2026 (AtlasIntel, Presidente, campo até 14/out,
-- n=5.000 — nenhuma pesquisa AtlasIntel de outubro/2026 encontrada na imprensa) ·
-- DF-01170/2026 (Real Time Big Data, Governador DF, campo até 13/out, n=1.600 — rodadas RTBD
-- encontradas têm campo 24-28/set, 04-08/set e 14-18/ago, nenhuma terminando 13/out) ·
-- BR-07337/2026, BR-01973/2026, BR-03973/2026, BR-07044/2026, BR-06482/2026, BR-02875/2026,
-- BR-06799/2026 (Quaest, Presidente, n=1.098/1.302/1.104, campo entre 11 e 13/out — múltiplos
-- registros TSE da Quaest com amostra pequena em dias consecutivos; só a rodada nacional de
-- 10-13/out com n=2.154 (BR-08729/2026, confirmada abaixo) teve cobertura de imprensa
-- identificável, as demais parecem recortes/registros sem matéria própria) · BR-07877/2026
-- (GERP, Presidente, campo até 12/out, n=2.400 — matérias encontradas citam datas de campo
-- inconsistentes entre si e números de protocolo TSE conflitantes entre fontes; não curada por
-- ambiguidade) · RJ-07597/2026 (Quaest, Governador RJ, campo até 11/out, n=1.302 — resultado
-- real do 1º turno em 04/out foi Ruas na frente com 49,27% e Paes em segundo com 42,76%,
-- invertendo as pesquisas pré-eleitorais; nenhuma pesquisa Quaest de 2º turno RJ com esse
-- campo/amostra encontrada na imprensa).

-- ───────────────────────────────────────────────────────────────────────────
-- 1) Quaest · Presidencial 2026 · 2º turno
--    TSE: BR-08729/2026 (protocolo pesqele BR087292026) · campo 10-13/out/2026 · n=2.154
--    Fonte: https://exame.com/brasil/pesquisa-para-presidente-quaest-flavio-bolsonaro-tem-46-e-lula-44/
--    (percentual "dos válidos" citado também na cobertura: Flávio 51/Lula 49 — NÃO usado aqui.
--    Usamos o percentual sobre o total de entrevistados, citado no corpo da matéria: Flávio
--    46% / Lula 44%, que é a convenção desta base.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_br_quaest as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-14', '2026-10-10', '2026-10-13',
         2154, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://exame.com/brasil/pesquisa-para-presidente-quaest-flavio-bolsonaro-tem-46-e-lula-44/',
         'BR-08729/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Quaest'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-08729/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br_quaest np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 46.0),
  ('Lula', 44.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 2) Nexus (BTG Pactual) · Presidencial 2026 · 2º turno
--    TSE: BR-07997/2026 (protocolo pesqele BR079972026, citado explicitamente na matéria de
--    registro) · campo 10-12/out/2026 · n=2.000 (TSE; a Nexus reportou 2.002 entrevistados)
--    Fonte: https://www.dgabc.com.br/Noticia/4352364/flavio-bolsonaro-tem-48-e-lula-45-em-empate-tecnico-aponta-pesquisa-btg-nexus
--    (percentual "dos válidos" citado também: Flávio 52/Lula 48 — NÃO usado aqui. Usamos o
--    percentual sobre o total de entrevistados: Flávio 48% / Lula 45% — 5% recusa/branco/nulo
--    + 2% não sabe/não respondeu completam os 100%, convenção desta base.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_br_nexus as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-13', '2026-10-10', '2026-10-12',
         2000, 2.0, 95, 'telefonica', 'nacional', 'estimulada',
         'https://www.dgabc.com.br/Noticia/4352364/flavio-bolsonaro-tem-48-e-lula-45-em-empate-tecnico-aponta-pesquisa-btg-nexus',
         'BR-07997/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Nexus'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-07997/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br_nexus np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 48.0),
  ('Lula', 45.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;
