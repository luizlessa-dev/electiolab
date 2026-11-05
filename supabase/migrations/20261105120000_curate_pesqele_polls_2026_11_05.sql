-- Curadoria diária pesqele_missing (2026-11-05).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 2 pesquisas novas confirmadas (protocolo TSE citado explicitamente na matéria, batendo
-- instituto+amostra+janela de campo). Ambas já tinham sido tentadas e descartadas em rodadas
-- anteriores (27/10, 28/10, 02/11 — "nenhuma matéria encontrada"); a matéria circulou depois.
--
-- ───────────────────────────────────────────────────────────────────────────
-- 1) Datafolha · Presidencial 2º turno (nacional) · 23-24 out 2026 · TSE BR-09540/2026 · n=4.050
--    Fonte: https://www.oliberal.com/politica/pesquisa-datafolha-flavio-tem-51-e-lula-49-dos-votos-validos-na-vespera-do-2-turno-1.1186426
--    (espelhada em terrabrasilnoticias.com, correio24horas.com.br, revistaoeste.com,
--    jornalopcao.com.br — registro TSE BR-09540/2026 citado explicitamente)
--    Percentual gravado é o corte sobre o TOTAL de entrevistados (convenção da base): Flávio
--    Bolsonaro 48% / Lula 46,8%→47% (vs. 51%/49% em votos válidos; branco/nulo 3%, NS/NR 2%).
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_br_pres_2t_datafolha_1024 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-24', '2026-10-23', '2026-10-24',
         4050, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://www.oliberal.com/politica/pesquisa-datafolha-flavio-tem-51-e-lula-49-dos-votos-validos-na-vespera-do-2-turno-1.1186426',
         'BR-09540/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Datafolha'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-09540/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br_pres_2t_datafolha_1024 np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 48.0),
  ('Lula', 47.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 2) PoderData/Aya · Presidencial 2º turno (nacional) · 23-24 out 2026 · TSE BR-02828/2026 · n=4.000
--    Fonte (ficha técnica/relatório oficial): https://static.poder360.com.br/uploads/2026/10/Relatorio-PoderData-Eleitoral-24out26-1.pdf
--    (matéria: https://poder360.com.br/poderdata/flavio-tem-51-e-lula-tem-49-dos-votos-validos-diz-poderdata-aya-2 ;
--    também noticiado por tvtnews.com.br — registro TSE BR-02828/2026 citado na ficha técnica)
--    Percentual gravado é o corte sobre o TOTAL de entrevistados (convenção da base): Flávio
--    49% / Lula 47% (vs. 51%/49% em votos válidos). 914 municípios, 27 UFs.
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_br_pres_2t_poderdata_1024 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-24', '2026-10-23', '2026-10-24',
         4000, 1.6, 95, 'telefonica', 'nacional', 'estimulada',
         'https://static.poder360.com.br/uploads/2026/10/Relatorio-PoderData-Eleitoral-24out26-1.pdf',
         'BR-02828/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'PoderData'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BR-02828/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br_pres_2t_poderdata_1024 np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 49.0),
  ('Lula', 47.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- Itens tentados e descartados nesta rodada (sem matéria confirmando protocolo+percentual sobre
-- o total, ou achados mas com ressalva que impede curar com segurança):
--   • BR-09158/2026 (Quaest, Presidente, campo até 24/10, n=3.702) — já curado em 2026-10-27
--     (migration 20261027120000), sem ação nova.
--   • BR-03259/2026 (Vox Brasil, Presidente, campo até 22/10, n=2.100) — já curado em 2026-10-27
--     (migration 20261027120000), sem ação nova.
--   • BR-09709/2026 (Datafolha, Presidente, campo até 22/10, n=2.520) — já curado em 2026-10-28
--     (migration 20261028120000), sem ação nova.
--   • DF-03453/2026 (Datafolha), DF-00368/2026 (Quaest), DF-08658/2026 (AtlasIntel) — Governador DF
--     2º turno, já em migration pendente de aplicação (20261030120000); DF-08658/2026 continua com
--     a ressalva de só ter corte "votos válidos" (57,9/42,1) — hoje não achei fonte nova com corte
--     sobre o total pra ela, Luiz: considere revisar/corrigir ou aceitar como está.
--   • BR-08234/2026 (Nexus/BTG Pactual, Presidente, campo até 24/10, n=2.000) — PROGRESSO: hoje
--     confirmei protocolo+instituto+amostra+janela de campo exatos (fontes: sbtnews.sbt.com.br,
--     tribunadejundiai.com.br, congressoemfoco.com.br, todas citando BR-08234/2026 e "BTG/Nexus"
--     explicitamente — descartei de propósito uma pesquisa CNT/MDA com os mesmos 50,5%/49,5% em
--     data próxima, que não cita esse protocolo). Só achei "votos válidos" (Flávio 50,5%/Lula
--     49,5%) e "votos prováveis" com ajuste de abstenção (Flávio 52,4%/Lula 47,6%) — SEM o corte
--     sobre o total de entrevistados. Não curado pra não quebrar a convenção da base (ver
--     histórico BR-07926/2026 abaixo). Fica pendente pra próxima rodada.
--   • BR-07926/2026 (PoderData/Aya, Presidente, campo até 21/10, n=4.000) — mesma situação de
--     rodadas anteriores: confirmado instituto/amostra/janela/campo (Flávio 51%/Lula 49% em votos
--     válidos, 865 municípios), mas sem o corte sobre o total. Continua pendente.
--   • BR-05581/2026 (AtlasIntel, Presidente, campo até 23/10, n=1.800) — não encontrada matéria
--     batendo esse protocolo/amostra específicos; a rodada nacional AtlasIntel de campo
--     terminando 23/10 que circulou na imprensa tem n=4.990 e protocolo BR-06380/2026 (já curada
--     em rodada anterior) — instituto certo, protocolo/amostra errados. Não curado.
--   • DF-08808/2026 (Instituto Verità, Governador DF 2º turno, campo até 22/10, n=1.220) — nenhuma
--     matéria encontrada citando essa pesquisa específica (mesma conclusão de rodadas anteriores:
--     05/10-30, 01/11). Achadas apenas pesquisas Verità do DF de OUTRAS janelas/protocolos, ambas
--     com divulgação proibida/suspensa pelo TRE-DF/Justiça Eleitoral por vício metodológico — não
--     relacionadas a este protocolo. Não curado.
--   • RJ-07597/2026 (Quaest, Governador RJ 2º turno, campo até 11/10, n=1.302) e RJ-02766/2026
--     (Datafolha, Governador+Senador RJ, campo até 08/10, n=1.204) — nenhuma matéria encontrada
--     (mesma conclusão de pelo menos 6 rodadas anteriores desde 14/10). ACHADO NOVO E IMPORTANTE
--     nesta rodada que pode explicar a ausência persistente de matéria: a cobertura de imprensa
--     indexada (congressoemfoco.com.br, dgabc.com.br/Noticia/4351654, mais.opovo.com.br,
--     seudinheiro.com) indica que o governo do RJ em 2026 foi DECIDIDO NO 1º TURNO — o TSE anulou
--     por 5x2 os 274.411 votos de Anthony Garotinho (declarado inelegível), o que elevou Douglas
--     Ruas (PL) a 50,88% dos votos válidos; o TRE-RJ homologou essa retotalização em 15/10/2026 e
--     proclamou Ruas governador eleito já no 1º turno — ou seja, NÃO HOUVE 2º turno de governador
--     no RJ. Luiz: vale revisar se os registros "Governador RJ 2026 - 2º Turno" (e "Senador Rio de
--     Janeiro 2026", que também não tem 2º turno possível) no nosso `elections` estão
--     corretos/ainda fazem sentido manter — se essa informação de imprensa se confirmar, RJ-07597
--     e RJ-02766 provavelmente são cenários hipotéticos pré-decisão do TSE (fase de incerteza
--     jurídica 05-15/10) e nunca terão uma pesquisa real de "2º turno" pra casar, o que explicaria
--     por que nenhuma das ~7 tentativas anteriores achou nada.
-- ───────────────────────────────────────────────────────────────────────────
