-- Curadoria diária pesqele_missing (2026-10-18).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 4 pesquisas confirmadas com fonte de imprensa real (percentual sobre o total de entrevistados
-- + protocolo TSE batendo, ou instituto+amostra+UF+data batendo exatamente). Convenção desta
-- base: percentual sobre o TOTAL de entrevistados (incluindo branco/nulo/indeciso/não sabe), não
-- "votos válidos" — por isso os números abaixo divergem dos títulos de várias matérias, que
-- manchetam o recorte de válidos.
--
-- Itens pesquisados e descartados por falta de rodada de outubro batendo instituto+UF+janela:
--   • CE-01031/2026 (Atlas Intel, Governador CE, campo 01-02/out) — última rodada Atlas Intel/CE
--     encontrada é de 28/ago-02/set; nenhuma rodada de 01-02/out circulou na imprensa.
--   • PR-05944/2026, SP-06906/2026, GO-03367/2026, MG-01942/2026, SC-01831/2026, RS-01974/2026,
--     PE-08717/2026, RJ-02601/2026, PE-00779/2026 (Atlas Intel, campo 01-02/out, diversos
--     estados) — mesma situação: só rodadas de agosto/setembro ou (SP) março circularam para
--     esses estados; nenhuma rodada de 01-02/out encontrada na imprensa pesquisada.
--   • RJ-02766/2026, MG-05749/2026 (Datafolha, Governador RJ/MG, campo até 08/out, n=1.204) —
--     não encontrada rodada Datafolha com campo terminando em 08/out para RJ ou MG; as rodadas
--     Datafolha circulantes nesses estados são de 01/out e 02-03/out (já curadas ou já
--     descartadas em rodadas anteriores).
--
-- Itens revisitados e novamente descartados (já descartados em rodada anterior, sem matéria nova
-- encontrada nesta rodada): PE-09774/2026, RJ-07597/2026, SP-07439/2026, GO-00674/2026,
-- PA-04580/2026, RS-08922/2026, RJ-01334/2026, PE-02404/2026, DF-07243/2026, RJ-07580/2026.
--
-- Demais itens da fila (Instituto Veritá, Vox Brasil, GERP, Índice Inteligência, campo 27/set-02/out,
-- diversos estados) não foram pesquisados nesta rodada por orçamento de sessão — seguem na fila
-- para tentativa futura.

-- ───────────────────────────────────────────────────────────────────────────
-- 1) Real Time Big Data · Governador DF · 2º turno
--    TSE: DF-01170/2026 (protocolo pesqele DF011702026) · campo 09-13/out/2026 · n=1.600
--    Fonte: https://www.poder360.com.br/poder-eleicoes-2026/celina-leao-tem-53-contra-36-de-grass-diz-pesquisa/
--    (percentual "dos válidos" também circulou: Celina 60%/Grass 40% — NÃO usado aqui. Usamos o
--    percentual sobre o total de entrevistados: Celina Leão 53% / Leandro Grass 36%, que é a
--    convenção desta base.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_df2t as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-14', '2026-10-09', '2026-10-13',
         1600, 2.0, 95, 'telefonica', 'nacional', 'estimulada',
         'https://www.poder360.com.br/poder-eleicoes-2026/celina-leao-tem-53-contra-36-de-grass-diz-pesquisa/',
         'DF-01170/2026', true
  from elections e, institutes i
  where e.name = 'Governador DF 2026 - 2º Turno'
    and i.name = 'Real Time Big Data'
    and not exists (
      select 1 from polls p where p.tse_registration = 'DF-01170/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_df2t np
join elections e on e.id = np.election_id
cross join (values
  ('Celina Leao', 53.0),
  ('Leandro Grass', 36.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 2) Atlas Intel · Governador Distrito Federal · 1º turno
--    TSE: DF-04297/2026 (protocolo pesqele DF042972026) · campo 27/set-02/out/2026 · n=1.200-1.211
--    Fonte: https://veronoticias.com/politica/celina-chega-a-453-e-amplia-vantagem-sobre-grass-no-df-diz-pesquisa-atlasintel/
--    (percentual "dos válidos" também circulou: Celina 45,3%/Grass 34%/Belmonte 11,7% — NÃO usado
--    aqui. Usamos o percentual sobre o total de entrevistados, citado pela Vero Notícias/Acorda DF:
--    Celina 42,8% / Grass 32,1% / Belmonte 11% / Cappelli 5,1% / Kiko Caputo 1,9% — branco-nulo
--    3,1% + não sabe 2,4% completam o total.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_df1t as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-04', '2026-09-27', '2026-10-02',
         1200, 3.0, 95, 'online', 'nacional', 'estimulada',
         'https://veronoticias.com/politica/celina-chega-a-453-e-amplia-vantagem-sobre-grass-no-df-diz-pesquisa-atlasintel/',
         'DF-04297/2026', true
  from elections e, institutes i
  where e.name = 'Governador Distrito Federal 2026'
    and i.name = 'Atlas Intel'
    and not exists (
      select 1 from polls p where p.tse_registration = 'DF-04297/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_df1t np
join elections e on e.id = np.election_id
cross join (values
  ('Celina Leao', 42.8),
  ('Leandro Grass', 32.1),
  ('Paula Belmonte', 11.0),
  ('Ricardo Cappelli', 5.1),
  ('Kiko Caputo', 1.9)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 3) Atlas Intel · Governador Bahia · 1º turno
--    TSE: BA-05671/2026 (protocolo pesqele BA056712026, citado explicitamente na matéria) · campo
--    27/set-02/out/2026 · n=2.199
--    Fonte: https://www.metropoles.com/brasil/jeronimo-marca-51-contra-47-de-acm-neto-na-bahia-diz-atlasintel
--    (percentual "dos válidos" também circulou: Jerônimo 51,5%/ACM Neto 47,4% — NÃO usado aqui.
--    Usamos o percentual sobre o total de entrevistados, citado pelo Metrópoles: Jerônimo 51% /
--    ACM Neto 47%.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_ba2 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-03', '2026-09-27', '2026-10-02',
         2199, 2.0, 95, 'online', 'nacional', 'estimulada',
         'https://www.metropoles.com/brasil/jeronimo-marca-51-contra-47-de-acm-neto-na-bahia-diz-atlasintel',
         'BA-05671/2026', true
  from elections e, institutes i
  where e.name = 'Governador BA 2026 - 1º Turno'
    and i.name = 'Atlas Intel'
    and not exists (
      select 1 from polls p where p.tse_registration = 'BA-05671/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_ba2 np
join elections e on e.id = np.election_id
cross join (values
  ('Jeronimo Rodrigues', 51.0),
  ('ACM Neto', 47.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- 4) Atlas Intel · Governador Pará · 1º turno
--    TSE: PA-04872/2026 (protocolo pesqele PA068722026) · campo 27/set-02/out/2026 · n=1.206
--    Fonte: https://www.band.com.br/politica/eleicoes/atlas-governo-do-para-hana-ghassan-tem-504-contra-444-de-dr-daniel
--    (percentual "dos válidos" também circulou: Hana 52,5%/Dr. Daniel 46,3% — NÃO usado aqui.
--    Usamos o percentual sobre o total de entrevistados, citado pela Band: Hana Ghassan 50,4% /
--    Dr. Daniel 44,4% / Araceli (Lemos) 0,9% / Gal Leite 0,4% — branco-nulo-indeciso 3,8%
--    completam o total.)
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_pa as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-03', '2026-09-27', '2026-10-02',
         1206, 3.0, 95, 'online', 'nacional', 'estimulada',
         'https://www.band.com.br/politica/eleicoes/atlas-governo-do-para-hana-ghassan-tem-504-contra-444-de-dr-daniel',
         'PA-04872/2026', true
  from elections e, institutes i
  where e.name = 'Governador PA 2026 - 1º Turno'
    and i.name = 'Atlas Intel'
    and not exists (
      select 1 from polls p where p.tse_registration = 'PA-04872/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_pa np
join elections e on e.id = np.election_id
cross join (values
  ('Hana Ghassan', 50.4),
  ('Dr Daniel', 44.4),
  ('Araceli Lemos', 0.9),
  ('Gal Leite', 0.4)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;
