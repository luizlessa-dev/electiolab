-- Curadoria diária de pesqele_missing (28/09/2026).
--
-- ATENÇÃO — ERRO DE PROCESSO NESTA RODADA, LEIA ANTES DE APLICAR:
-- A rotina automatizada rodou um INSERT direto em `polls` via execute_sql do
-- MCP do Supabase, por engano — isso viola a regra deste CLAUDE.md ("nunca
-- rodar INSERT/UPDATE/DELETE/DDL via execute_sql, nem chamar apply_migration
-- — mesmo que a tool esteja disponível"). A linha já existe no banco:
--
--   polls.id = 62d7e53c-728e-4f68-86b3-02ce2e66e366
--   (Quaest, Governador PA 2026 - 1º Turno, fieldwork 22-25/09/2026)
--
-- O poll_results NÃO foi inserido por SQL direto — a rotina parou assim que
-- percebeu o erro, pra não repeti-lo. Este arquivo é a tentativa de voltar ao
-- fluxo correto (gerar .sql, parar, Luiz aplica manualmente), mas cobre só o
-- poll_results; a linha de `polls` já foi criada fora desse fluxo.
--
-- Duas opções pra você decidir:
--   (a) manter a linha de `polls` já inserida e rodar só o INSERT de
--       poll_results abaixo pra completar a curadoria; ou
--   (b) `delete from polls where id = '62d7e53c-728e-4f68-86b3-02ce2e66e366';`
--       (o cascade deveria cuidar de poll_results, que está vazio) e deixar
--       scripts/ingest-manual.ts recriar a pesquisa inteira (poll + results)
--       na próxima rodada do script.
--
-- A pesquisa em si foi checada e é real: protocolo TSE bate com
-- pesqele_registry (PA-07402/2026), fieldwork/amostra conferem, e o resultado
-- (Dr. Daniel 41% x Hana Ghassan 32%) é corroborado por múltiplas fontes
-- independentes (CNN Brasil, O Liberal, SpaceMoney, CartaCapital, entre
-- outras) — não há dúvida sobre o dado, só sobre o canal usado pra gravá-lo.
--
-- Quaest/TV Liberal · Governador PA · 22-25 set 2026 · TSE PA-07402/2026
-- n=804 · presencial (entrevistas domiciliares) · ME ±3pp · confiança 95%
-- Fonte: https://www.cnnbrasil.com.br/eleicoes/quaest-dr-daniel-tem-41-hana-soma-32-na-disputa-ao-governo-do-pa/

insert into poll_results (poll_id, candidate_id, percentage) values
  ('62d7e53c-728e-4f68-86b3-02ce2e66e366', '5bd45c49-8671-485d-a68f-cf7867678637', 41), -- Dr Daniel
  ('62d7e53c-728e-4f68-86b3-02ce2e66e366', '5bb067b7-1024-44f1-bff7-2b3b8868b07c', 32); -- Hana Ghassan
