-- Curadoria diária pesqele_missing (2026-10-20).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 1 pesquisa confirmada com fonte de imprensa real (percentual sobre o total de entrevistados +
-- protocolo TSE citado explicitamente na matéria batendo com instituto+amostra+janela de campo).
-- Convenção desta base: percentual sobre o TOTAL de entrevistados (incluindo branco/nulo/
-- indeciso/não sabe), não "votos válidos" — por isso os números abaixo divergem dos títulos de
-- várias matérias, que manchetam o recorte de válidos.
--
-- Itens pesquisados e descartados por falta de matéria com protocolo/data/instituto batendo:
--   • BR-08535/2026, BR-03163/2026 (Quaest, Presidente, campo até 20/out) — a rodada Quaest em
--     curso (campo 17-20/out) ainda não tinha sido divulgada no momento da pesquisa; uma matéria
--     da AtlasIntel (ver item curado abaixo) menciona essa rodada Quaest como "ainda a divulgar".
--   • BR-03835/2026 (GERP, Presidente, campo até 20/out) — campo terminou hoje, sem matéria
--     publicada ainda. A rodada anterior do GERP (campo 8-12/out, BR-07877/2026) já foi curada em
--     rodada passada.
--   • BR-02552/2026 (Real Time Mídia, Presidente, campo até 19/out) — nenhuma matéria encontrada
--     com campo terminando em 19/out; as rodadas RTBD circulantes são de antes do 1º turno (até
--     01/out) ou mais antigas.
--   • BR-02586/2026 (PoderData, Presidente, campo até 18/out) — nenhuma matéria encontrada com
--     campo terminando em 18/out; rodadas PoderData/Aya circulantes nesta semana são de campo
--     5-7/out, 10-12/out e 13-15/out (já curadas ou já descartadas em rodadas anteriores).
--   • BR-04499/2026 (Nexus/BTG, Presidente, campo até 18/out) — nenhuma matéria encontrada com
--     campo terminando em 18/out; a rodada Nexus/BTG circulante é a de 10-12/out (já curada).
--   • BR-04332/2026 (Vox Brasil, Presidente, campo até 17/out) — nenhuma matéria encontrada com
--     campo terminando em 17/out; a rodada Vox Brasil circulante é a de 05-07/out (já curada).
--   • BR-06396/2026 (Instituto Veritá, Presidente, campo até 19/out, n=15.554) — amostra atípica
--     e nenhuma matéria com data/protocolo verificável encontrada batendo com essa janela de
--     campo específica. Instituto com histórico de pesquisas suspensas pela Justiça Eleitoral em
--     2026 por vício metodológico — não curado por falta de confirmação, não por suspeita
--     genérica contra o instituto.
--   • DF-01691/2026 (Real Time Mídia, Governador DF 2º turno, campo até 19/out) — nenhuma
--     matéria encontrada com essa janela de campo; a rodada RTBD/DF circulante é a de 09-13/out
--     (DF-01170/2026, já curada em rodada passada).
--   • DF-00402/2026 (Quaest, Governador DF 2º turno, campo até 20/out) — campo terminou hoje,
--     sem matéria publicada ainda. A rodada Quaest/DF circulante é a de 08-11/out (DF-08737/2026,
--     já curada em rodada passada).
--
-- Itens revisitados e novamente descartados (já descartados em rodadas anteriores, sem matéria
-- nova encontrada nesta rodada):
--   • RJ-07597/2026 (Quaest, Governador RJ 2º turno, campo até 11/out) — nenhuma pesquisa Quaest/
--     RJ de outubro encontrada na imprensa pesquisada nesta rodada (3ª tentativa).
--   • RJ-02766/2026, SP-07439/2026, PE-09774/2026, MG-05749/2026 (Datafolha, Governador RJ/SP/PE/
--     MG, campo até 08/out) — SP, PE e MG não têm eleição de 2º turno para Governador cadastrada
--     (decididas no 1º turno); RJ já foi descartado em rodada anterior por falta de matéria com
--     essa janela de campo específica. Mantidos fora da curadoria.
with new_poll_br2t_atlas as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-19', '2026-10-13', '2026-10-18',
         4998, 1.0, 95, 'online', 'nacional', 'estimulada',
         'https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/atlasintel-presidente-outubro-2026-segundo-turno-2/',
         'BR-02418/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Atlas Intel'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-02418/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br2t_atlas np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 49.8),
  ('Lula', 47.6)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;
