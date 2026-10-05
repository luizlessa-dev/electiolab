-- ⚠️  APLICAR NO PROJETO "transparencia-federal" (ref redggdtakzmsabwvjzhb),
--     NÃO no projeto ElectioLab (xoxztzologqeqbajlhya).
--     Registro; aplicação manual pelo Luiz no SQL Editor do TF:
--     https://supabase.com/dashboard/project/redggdtakzmsabwvjzhb/sql/new
--     Não aplicada. PARTE 2 de 2: aplicar DEPOIS de 20261005010000_tf_revoke_write_views_and_functions.sql.
--
-- Revogação ampla de escrita do anon nas TABELAS do TF e dos defaults que a recriam. Mesmo desenho do
-- ElectioLab (20261003160000 e 20261003161000, já aplicadas lá).
--
-- Estado verificado em 2026-10-05 (somente leitura)
--   • 463 tabelas no schema public; 397 dão INSERT/UPDATE/DELETE ao anon (default do Supabase) e 626
--     relações no total davam escrita ao anon (inclui as 20 views da PARTE 1); 672 têm MAINTAIN do PG17.
--   • O RLS segura: NENHUMA policy deixa o anon escrever. Todas as policies de escrita exigem
--     role = service_role no JWT ("Service insert/update ...", "service_write_*") ou auth.uid()
--     (ask_quota, do usuário logado). Logo, tirar o GRANT do anon não pode quebrar nada que funcione
--     hoje; ele só remove a segunda camada que faltava (se alguém criar uma policy solta ou desligar o
--     RLS por engano, o GRANT deixa de ser a rede de segurança que não existe).
--   • O app web do TF (tf-score/packages/web) não faz nenhuma escrita com a chave pública; os
--     ingestores (Python/Deno/Node, workflows e edge functions) usam a service role.
--   • Duas tabelas sem RLS: spatial_ref_sys (PostGIS, do supabase_admin: o anon tem INSERT/UPDATE/DELETE,
--     pode corromper a definição de SRIDs; precisa de revogação por quem for dono, ver abaixo) e
--     aux_dou_fornecedores_alvo.
--   • Defaults (pg_default_acl, dono postgres) dão ao anon arwdxtm e ao authenticated arwdxtm em toda
--     tabela nova, e ao supabase_admin arwdDxtm: a próxima tabela traz tudo de volta.
--
-- O que NÃO muda de propósito
--   • `authenticated` mantém INSERT/UPDATE/DELETE: ask_quota tem policies para o usuário logado e outros
--     apps seus usam o TF com sessão. Só perde TRUNCATE/REFERENCES/TRIGGER/MAINTAIN.
--   • service_role não é tocada. Leitura (SELECT) do anon não muda: o site público depende dela.
--
-- Fica de fora (limite do SQL Editor)
--   • Objetos do papel supabase_admin (spatial_ref_sys, geometry_columns, geography_columns) e o default
--     desse papel só ele mesmo altera. A migration avisa (NOTICE) em vez de abortar. Se o aviso aparecer
--     para spatial_ref_sys, rodar a revogação com um papel que seja dono ou mover o PostGIS para o schema
--     `extensions` (recomendação do próprio Supabase).
--
-- Idempotente. Copiar com: LC_ALL=en_US.UTF-8 pbcopy < arquivo.sql

begin;

-- 1. anon: sem nenhuma escrita em tabela. authenticated: sem truncate/references/trigger/maintain.
--    Em loop e tolerante a objetos de outro dono.
do $$
declare r record;
begin
  for r in
    select c.oid::regclass as rel, pg_get_userbyid(c.relowner) as dono
    from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
  loop
    begin
      execute format('revoke insert, update, delete, truncate, references, trigger, maintain on %s from anon', r.rel);
      execute format('revoke truncate, references, trigger, maintain on %s from authenticated', r.rel);
    exception when insufficient_privilege then
      raise notice 'sem permissão para revogar em % (dono %): conferir à parte', r.rel, r.dono;
    end;
  end loop;
end $$;

-- 2. Defaults: tabela nova não nasce com escrita para anon, nem com truncate/references/trigger/maintain
--    para authenticated. (O Supabase aplica o default do dono postgres, que é quem roda o SQL Editor.)
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger, maintain on tables from anon;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from authenticated;

do $$
begin
  alter default privileges for role supabase_admin in schema public
    revoke insert, update, delete, truncate, references, trigger, maintain on tables from anon;
  alter default privileges for role supabase_admin in schema public
    revoke truncate, references, trigger, maintain on tables from authenticated;
exception when insufficient_privilege then
  raise notice 'default privileges de supabase_admin não alterados (sem permissão); só afeta objetos criados por esse papel';
end $$;

commit;

-- ── Conferência (rodar depois) ─────────────────────────────────────────────
-- 1) Esperado: 0 linhas (pode sobrar spatial_ref_sys se o aviso de permissão apareceu)
--    select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','v','m','f')
--      and (has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE')
--        or has_table_privilege('anon', c.oid, 'TRUNCATE') or has_table_privilege('anon', c.oid, 'MAINTAIN'));
-- 2) Esperado: 0
--    select count(*) from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','v','m','f')
--      and (has_table_privilege('authenticated', c.oid, 'TRUNCATE') or has_table_privilege('authenticated', c.oid, 'MAINTAIN'));
-- 3) Esperado: o anon continua lendo (o site público depende disso), e authenticated ainda grava em ask_quota
--    select count(*) filter (where has_table_privilege('anon', c.oid, 'SELECT')) as anon_le from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','v','m');
--    select has_table_privilege('authenticated', 'public.ask_quota', 'INSERT') as auth_grava_ask_quota;
-- 4) Default do dono postgres para tabelas: anon=r, authenticated=arwd
--    select pg_get_userbyid(defaclrole), defaclacl from pg_default_acl where defaclnamespace = 'public'::regnamespace and defaclobjtype = 'r';
