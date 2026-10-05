-- APLICAR NO PROJETO ElectioLab (ref xoxztzologqeqbajlhya). Aplicação manual pelo Luiz no
-- SQL Editor (regra do CLAUDE.md). O arquivo é o registro. Complemento de
-- 20261003160000_revoke_anon_write_grants.sql, já aplicada.
--
-- Lacuna da migration anterior, achada ao conferir o resultado dela: no Postgres 17 a lista de
-- privilégios de tabela ganhou MAINTAIN (VACUUM, ANALYZE, REFRESH MATERIALIZED VIEW, LOCK TABLE).
-- O default do Supabase é arwdDxtm (o `m` final), e a migration anterior revogou os privilégios do
-- Postgres 15 (insert, update, delete, truncate, references, trigger) e deixou `m` para anon e
-- authenticated em 84 relações. Não é explorável pela API (o PostgREST não expõe esses comandos e o
-- anon não tem conexão direta), mas é privilégio de manutenção que nenhum dos dois precisa.
--
-- Efeito: anon e authenticated deixam de ter MAINTAIN em todo o schema public e nos defaults do dono
-- postgres. SELECT (anon) e INSERT/UPDATE/DELETE (authenticated, para o painel editorial) ficam
-- como estão. Idempotente.
--
-- Fica de fora (limite do SQL Editor): o default do papel supabase_admin continua arwdDxtm para
-- anon/authenticated, porque só esse papel pode alterá-lo. Só afeta tabela criada por ele no schema
-- public, o que não acontece nos fluxos deste projeto (tabelas nascem do postgres). Se um dia nascer,
-- rodar a conferência abaixo.

begin;

revoke maintain on all tables in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke maintain on tables from anon, authenticated;

commit;

-- Conferência (esperado: 0 e 0; a segunda deve mostrar anon=r e authenticated=arwd para o dono postgres)
--   select count(*) filter (where has_table_privilege('anon', c.oid, 'MAINTAIN')) as anon_maintain,
--          count(*) filter (where has_table_privilege('authenticated', c.oid, 'MAINTAIN')) as auth_maintain
--   from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','v','m','f');
--   select pg_get_userbyid(defaclrole), defaclacl from pg_default_acl
--   where defaclnamespace = 'public'::regnamespace and defaclobjtype = 'r';
