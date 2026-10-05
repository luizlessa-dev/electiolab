-- APLICAR NO PROJETO ElectioLab (ref xoxztzologqeqbajlhya). Aplicação manual pelo Luiz no
-- SQL Editor (regra do CLAUDE.md). O arquivo é o registro; não é aplicado automaticamente.
--
-- Fecha a escrita anônima em todo o schema `public`, em camadas, e impede que ela volte.
--
-- Estado verificado ao vivo em 2026-10-03 (somente leitura)
--   • 77 relações tinham GRANT de INSERT/UPDATE/DELETE para `anon` (o default do Supabase); 13
--     tinham também TRUNCATE (que o RLS não cobre; o PostgREST não o expõe, mas é privilégio a mais).
--   • Hoje o RLS segura quase tudo. Os ÚNICOS lugares onde o anon consegue gravar são:
--       - newsletter_subscribers (policy "public insert signup": cadastro, intencional);
--       - as 7 tabelas sub_imob_* (policy "service_role_all" criada com roles={public} e
--         USING (true): o nome diz service role, o efeito é "qualquer um"). Vazias e sem uso no app,
--         mas desenhadas para CPF, nome, e-mail e endereço.
--   • A função SECURITY DEFINER increment_rate_limit foi concedida a anon/authenticated de propósito,
--     mas o único chamador (src/lib/middleware/distributed-rate-limit.ts) usa a service role. Com a
--     chave pública qualquer um chama /rest/v1/rpc/increment_rate_limit com a chave de um IP alheio e
--     esgota o limite dele (ou enche rate_limit_counters de lixo).
--   • Os defaults do schema (pg_default_acl, dono postgres) dão arwdDxtm a anon/authenticated em TODA
--     tabela nova: por isso a migration P0 de 28/09 (20260928100000, que cobria 5 tabelas) nunca
--     bastou, e a próxima tabela traria o problema de volta.
--   • As 7 views com GRANT de escrita NÃO são brecha: 5 não são atualizáveis (agregação/join) e as 2
--     atualizáveis (pesqele_missing_*) são security_invoker, sob o RLS de pesqele_registry.
--
-- O que NÃO muda de propósito
--   • `authenticated` mantém INSERT/UPDATE/DELETE: o painel admin grava com sessão autenticada sob
--     policies que checam o e-mail (candidates_editorial_updatable, approval_polls_*, polls_*,
--     weighted_averages_*, candidate_gaffes_*, user_alerts_*). Revogar isso quebraria o editorial.
--     A migration P0 de 28/09 revoga de `authenticated` em candidates e outras: NÃO aplicar essa parte
--     sem antes decidir mover o fluxo editorial para a service role.
--   • `service_role` não é tocada.
--   • anon continua com INSERT em newsletter_subscribers (exceção única; o route usa a service role e só
--     cai na chave pública como fallback).
--
-- Idempotente. Copiar com: LC_ALL=en_US.UTF-8 pbcopy < arquivo.sql

begin;

-- 1. anon: sem nenhuma escrita em tabelas, views e matviews do schema public.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon;

-- 2. A única exceção: cadastro de newsletter (policy "public insert signup").
grant insert on public.newsletter_subscribers to anon;

-- 3. authenticated: sem os privilégios que nenhuma policy usa e que o RLS não cobre.
revoke truncate, references, trigger
  on all tables in schema public from authenticated;

-- 4. Defaults: tabela criada daqui para frente não nasce com escrita para anon, nem com
--    truncate/references/trigger para authenticated. (O Supabase aplica o default do dono postgres,
--    que é quem roda o SQL Editor e as migrations.)
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from authenticated;

-- Os objetos criados pelo supabase_admin têm default próprio; só dá para mexer nele se o papel atual
-- for membro. Tenta, e avisa em vez de falhar a migration inteira.
do $$
begin
  alter default privileges for role supabase_admin in schema public
    revoke insert, update, delete, truncate, references, trigger on tables from anon;
  alter default privileges for role supabase_admin in schema public
    revoke truncate, references, trigger on tables from authenticated;
exception when insufficient_privilege then
  raise notice 'default privileges de supabase_admin não alterados (sem permissão); só afeta objetos criados por esse papel';
end $$;

-- 5. increment_rate_limit: só a service role (o único chamador). `public` incluído de propósito:
--    função nasce com EXECUTE para PUBLIC, e revogar só de anon não tira o que ele herda por aí.
revoke execute on function public.increment_rate_limit(text, integer, integer) from public, anon, authenticated;

-- 6. sub_imob_*: tirar a policy que vale para todo mundo. Sem policy, só a service role (que ignora
--    RLS) acessa. Tabelas vazias e sem uso no app (verificado).
drop policy if exists service_role_all on public.sub_imob_alertas;
drop policy if exists service_role_all on public.sub_imob_consultas;
drop policy if exists service_role_all on public.sub_imob_dados;
drop policy if exists service_role_all on public.sub_imob_dossies;
drop policy if exists service_role_all on public.sub_imob_pacotes;
drop policy if exists service_role_all on public.sub_imob_pessoas;
drop policy if exists service_role_all on public.sub_imob_resultados;

commit;

-- ── Conferência (rodar depois) ─────────────────────────────────────────────
-- 1) Esperado: UMA linha: newsletter_subscribers | INSERT
--    select table_name, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and grantee = 'anon'
--      and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
--    order by 1, 2;
-- 2) Esperado: 0 (authenticated sem truncate/references/trigger)
--    select count(*) from information_schema.role_table_grants
--    where table_schema = 'public' and grantee = 'authenticated' and privilege_type in ('TRUNCATE','REFERENCES','TRIGGER');
-- 3) Esperado: false / true
--    select has_function_privilege('anon', 'public.increment_rate_limit(text,integer,integer)', 'EXECUTE'),
--           has_function_privilege('service_role', 'public.increment_rate_limit(text,integer,integer)', 'EXECUTE');
-- 4) Esperado: 0 policies em sub_imob_*
--    select count(*) from pg_policies where schemaname = 'public' and tablename like 'sub\_imob\_%';
-- 5) Esperado: nenhum default de escrita para anon em tabelas
--    select pg_get_userbyid(defaclrole), defaclacl from pg_default_acl where defaclnamespace = 'public'::regnamespace and defaclobjtype = 'r';
-- Teste funcional (fora do SQL Editor, com a anon key pública). Esperado: 401/403 nos dois POST, 201 no de newsletter:
--   curl -i -X POST 'https://xoxztzologqeqbajlhya.supabase.co/rest/v1/candidates' -H "apikey: <anon>" -H "Authorization: Bearer <anon>" -H "Content-Type: application/json" -d '{"name":"teste"}'
--   curl -i -X POST 'https://xoxztzologqeqbajlhya.supabase.co/rest/v1/rpc/increment_rate_limit' -H "apikey: <anon>" -H "Authorization: Bearer <anon>" -H "Content-Type: application/json" -d '{"key_param":"teste"}'
