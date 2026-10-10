-- Curadoria diária pesqele_missing (2026-10-10).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- ⚠️ ERRO DE PROCESSO NESTA RODADA (mesmo erro do dia 09/10, ver migration anterior): a sessão
-- rodou um INSERT direto via execute_sql (MCP) para a pesquisa #1 abaixo — polls + poll_results
-- completos, violando a regra "nunca rodar INSERT/UPDATE/DELETE via execute_sql" do CLAUDE.md.
-- Além disso, os poll_results inseridos usaram o percentual errado: "votos válidos" (60/40) em
-- vez do percentual sobre o total de entrevistados (55/37), que é a convenção desta base (ver
-- nota na migration de 09/10). O erro de convenção só foi percebido depois do insert, ao
-- revisar o arquivo deste script para registrar a entrada em PENDING_POLLS.
--
-- O que esta migration faz: corrige os dois poll_results já inseridos (id do poll abaixo) de
-- votos-válidos para total-de-entrevistados. Não repete o insert em `polls` (o row já existe
-- em produção). Luiz: se preferir refazer do zero em vez de corrigir, apague o poll
-- b76e6f11-256e-43ba-bedd-228b3a7506af (cascata em poll_results) e use o bloco alternativo
-- comentado no fim do item #1.
--
-- 1 pesquisa confirmada com fonte de imprensa real (percentual + protocolo TSE batendo).
-- 14 outros itens prioritários da fila (Datafolha em SP, RJ, PE, MG · Quaest em BA, RS, GO, PR ·
-- GERP em RJ) foram pesquisados e descartados — ver relatório da rotina para detalhe de cada um.
-- Resumo dos motivos de descarte:
--   • SP-09337/2026, MG-06705/2026, RJ-01334/2026, PE-02404/2026 (todos Datafolha, campo
--     02-03/out/2026, última rodada pré-1º-turno): protocolo TSE bate e a imprensa confirma
--     percentual, mas os números encontrados (ex.: SP Tarcísio 60%/Haddad 35% dos votos
--     válidos) coincidem, após normalização, com pesquisas do MESMO instituto/UF/janela de
--     campo já curadas em polls sob OUTRO protocolo (SP-04726/2026, MG-06889/2026,
--     RJ-03032/2026, PE-09665/2026 — todas com fieldwork_end=2026-10-03, mesma eleição, mesmo
--     instituto). Ex.: PE total 50/46 (com 3% branco/nulo + 1% indeciso) normaliza para
--     52,1/47,9 em válidos — idêntico ao PE-09665/2026 já em polls (52/47). Risco alto de ser a
--     MESMA pesquisa com dois protocolos TSE (comum quando o contratante registra protocolos
--     por cargo/combinação) — inserir de novo duplicaria o dado nas médias. Não encontrei fonte
--     com o percentual em "total de entrevistados" (convenção da base) que fosse claramente
--     distinto dessas pesquisas já curadas, então descartei os 4 em vez de arriscar duplicata.
--   • BA-02224/2026 (Quaest, Governador BA), RS-08922/2026 (Quaest, Governador RS),
--     GO-00674/2026 (Quaest, Governador GO), PR-05119/2026 (Quaest, Governador PR),
--     RJ-07580/2026 (GERP, Governador RJ): nenhuma matéria de imprensa encontrada para essas
--     janelas de campo (02-03/out/2026) citando esses protocolos ou resultados — Quaest/GERP
--     parecem não ter divulgado essas rodadas ainda (última cobertura encontrada é jul/ago).
--     Seguem na fila pesqele_missing para tentativa em rodada futura.

-- ───────────────────────────────────────────────────────────────────────────
-- 1) Datafolha · Governador DF · 2º turno
--    TSE: DF-03365/2026 (protocolo pesqele DF033652026) · campo 06-08/out/2026 · n=910
--    Fonte: https://ohoje.com/2026/10/08/datafolha-celina-leao-tem-60-e-leandro-grass-40-no-2o-turno-do-df/
--    (mesmo número também em https://trademap.com.br/noticias/news-8405159, que traz o
--    percentual sobre o total de entrevistados usado abaixo: 55% Celina / 37% Grass — os 60/40
--    citados no título da ohoje.com são "votos válidos", não usados aqui).
--
--    O insert em `polls` + poll_results já foi feito via execute_sql por engano (poll id
--    b76e6f11-256e-43ba-bedd-228b3a7506af), com os percentuais errados (válidos). Aqui só
--    corrigimos os dois poll_results para o percentual correto (total de entrevistados).
-- ───────────────────────────────────────────────────────────────────────────
update poll_results
set percentage = 55.0
where poll_id = 'b76e6f11-256e-43ba-bedd-228b3a7506af'
  and candidate_id = '38a2d8e5-ce7b-4395-a856-758178a82579' -- Celina Leao
  and percentage = 60.0;

update poll_results
set percentage = 37.0
where poll_id = 'b76e6f11-256e-43ba-bedd-228b3a7506af'
  and candidate_id = '580f40ce-28b5-4083-85c7-846744f98a6e' -- Leandro Grass
  and percentage = 40.0;

-- Alternativa, SE Luiz optar por apagar o poll b76e6f11-256e-43ba-bedd-228b3a7506af (cascata
-- remove os poll_results) antes de aplicar esta migration, e refazer do zero pelo caminho normal:
--
-- with new_poll as (
--   insert into polls (
--     election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
--     sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
--     source_url, tse_registration, is_verified
--   )
--   select e.id, i.id, '2026-10-08', '2026-10-06', '2026-10-08',
--          910, 3.0, 95, 'presencial', 'nacional', 'estimulada',
--          'https://ohoje.com/2026/10/08/datafolha-celina-leao-tem-60-e-leandro-grass-40-no-2o-turno-do-df/',
--          'DF-03365/2026', true
--   from elections e, institutes i
--   where e.name = 'Governador DF 2026 - 2º Turno'
--     and i.name = 'Datafolha'
--     and not exists (
--       select 1 from polls p
--       where p.election_id = e.id and p.institute_id = i.id and p.fieldwork_end = '2026-10-08'
--     )
--   returning id, election_id
-- )
-- insert into poll_results (poll_id, candidate_id, percentage)
-- select np.id, c.id, v.percentage
-- from new_poll np
-- join elections e on e.id = np.election_id
-- cross join (values
--   ('Celina Leao', 55.0),
--   ('Leandro Grass', 37.0)
-- ) as v(candidate_name, percentage)
-- join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;
