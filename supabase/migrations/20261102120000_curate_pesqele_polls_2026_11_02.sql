-- Curadoria diária pesqele_missing (2026-11-02).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 1 pesquisa nova confirmada com fonte de imprensa real (protocolo TSE citado explicitamente
-- na matéria, instituto+amostra+janela de campo exatos).
--
-- ───────────────────────────────────────────────────────────────────────────
-- Real Time Big Data · Presidencial 2º turno (nacional) · 15-19 out 2026 · TSE BR-02952/2026
--   n=2.000 · telefônica · ME: ±2pp · divulgada 20/10/2026
--   Fonte: https://www.dgabc.com.br/Noticia/4353712/real-time-big-data-flavio-tem-52-dos-votos-validos-e-lula-48-em-empate-tecnico
--   (espelhada em revistaoeste.com, acritica.net, correio24horas.com.br, tribunadejundiai.com.br,
--   bahianoticias.com.br, movimentoeconomico.com.br, jornaldocomercio.com — protocolo
--   BR-02952/2026 citado explicitamente num dos veículos).
--   Percentual gravado é o corte sobre o TOTAL de entrevistados (convenção da base), não sobre
--   votos válidos: Flávio Bolsonaro 48% / Lula 45% sobre o total (vs. 52%/48% em votos válidos).
--   ATENÇÃO (armadilha identificada e evitada): existe uma SEGUNDA pesquisa Real Time Big Data,
--   campo 19-22/10, divulgada 23/10, com os MESMOS 52%/48% em votos válidos mas corte sobre o
--   total diferente (49%/45%) — não é esta; não confundir se aparecer na fila depois com outro
--   protocolo.
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_br_pres_2t_rtbd_1019 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-20', '2026-10-15', '2026-10-19',
         2000, 2.0, 95, 'telefonica', 'nacional', 'estimulada',
         'https://www.dgabc.com.br/Noticia/4353712/real-time-big-data-flavio-tem-52-dos-votos-validos-e-lula-48-em-empate-tecnico',
         'BR-02952/2026', true
  from elections e, institutes i
  where e.name = 'Presidencial 2026 - 2º Turno'
    and i.name = 'Real Time Big Data'
    and not exists (
      select 1 from polls p
      join elections e2 on e2.id = p.election_id
      where p.tse_registration = 'BR-02952/2026' and e2.name = 'Presidencial 2026 - 2º Turno'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_br_pres_2t_rtbd_1019 np
join elections e on e.id = np.election_id
cross join (values
  ('Flávio Bolsonaro', 48.0),
  ('Lula', 45.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- Itens tentados e descartados nesta rodada (sem matéria confirmando protocolo+percentual, ou
-- achados mas com ressalva que impede curar com segurança):
--   • BR-09540/2026, BR-03112/2026 (Datafolha, Presidente, campo até 24/10, n=4050 e n=1620) —
--     nenhuma matéria encontrada batendo essas amostras/datas especificamente (WebFetch bloqueado
--     pra quase todo domínio de notícia neste ambiente, só WebSearch com snippets).
--   • BR-09158/2026 (Quaest/Genial, Presidente, campo até 24/10, n=3702) — nenhuma matéria batendo
--     essa amostra; Quaest tem várias rodadas de 2º turno na mesma janela com números diferentes.
--   • BR-08234/2026 (Nexus, Presidente, campo até 24/10, n=2000) — achado próximo (19/10, campo
--     16-18/10, n=2002, Flávio 50,3/Lula 49,7) mas campo e amostra não batem exatamente — não
--     curado pra evitar confundir com outra rodada da Nexus.
--   • BR-09327/2026 (GERP, Presidente, campo até 24/10, n=2400) — ARMADILHA: GERP tem pelo menos
--     3 rodadas na mesma semana (campo 8-12/10, 14-16/10, 19-21/10) com resultados divergentes
--     entre si; nenhuma bate exatamente campo até 24/10 — não curado.
--   • BR-02828/2026 (PoderData, Presidente, campo até 24/10, n=4000) — nenhuma matéria com
--     resultado publicado encontrada pra essa rodada específica.
--   • BR-07926/2026 (PoderData/Aya, Presidente, campo até 21/10, n=4000) — CONFIRMADO instituto/
--     cargo/amostra/janela (865 municípios, divulgada 22/10, Flávio 51%/Lula 49% em votos
--     válidos — revistaoeste.com, poder360.com.br, sbtnews.sbt.com.br) mas NÃO encontrado o corte
--     sobre o total de entrevistados (convenção da base) — fica pendente pra próxima rodada até
--     achar fonte com esse recorte, não curado com números de votos válidos.
--   • DF-08658/2026 (AtlasIntel, Governador DF 2º turno, campo até 23/10, n=1800) — já pendente de
--     rodadas anteriores (votos válidos Celina 57,9%/Grass 42,1%); hoje também não achei fonte
--     nova com o corte sobre o total.
--   • DF-01691/2026 (Real Time Big Data, Governador DF 2º turno, campo até 19/10, n=1600) —
--     ARMADILHA identificada: achei RTBD do DF bem parecida (Celina 53%/Grass 36%) mas com
--     protocolo DF-01170/2026 (não DF-01691) e campo 9-13/10 (não 15-19/10) — instituto e cargo
--     certos, protocolo e janela errados (soubrasilia.com, poder360.com.br). Não curado com esses
--     números.
--   • BR-02418/2026 (AtlasIntel, Presidente, campo até 18/10, n=5000) — ARMADILHA identificada:
--     achei AtlasIntel/Bloomberg com protocolo BR-06380/2026 (não BR-02418), n=4990, campo 18-23/10
--     — parecida mas protocolo e janela diferentes. Não curado.
--   • BR-02586/2026 (PoderData/Aya, Presidente, campo até 18/10, n=3000) — nenhuma fonte com campo
--     terminando em 18/10 e n=3000 encontrada (as rodadas PoderData achadas nessa janela são a
--     de n=4000/campo 19-21 já tratada acima, com protocolo diferente).
-- ───────────────────────────────────────────────────────────────────────────
