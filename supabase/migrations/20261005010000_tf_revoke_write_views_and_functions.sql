-- ⚠️  APLICAR NO PROJETO "transparencia-federal" (ref redggdtakzmsabwvjzhb),
--     NÃO no projeto ElectioLab (xoxztzologqeqbajlhya).
--     O arquivo mora aqui só como registro (regra do CLAUDE.md). Aplicação manual pelo Luiz no
--     SQL Editor do projeto TF: https://supabase.com/dashboard/project/redggdtakzmsabwvjzhb/sql/new
--     Não aplicada. PARTE 1 (urgente) de 2; a PARTE 2 é 20261005020000_tf_revoke_anon_write_grants.sql.
--
-- Fecha duas portas de escrita anônima no TF. Achadas em 2026-10-05 (leitura do banco, sem escrever):
--
-- 1) VIEWS GRAVÁVEIS QUE IGNORAM O RLS. 20 views do schema public são atualizáveis (single-table ou
--    projeção simples), NÃO têm security_invoker e dão INSERT/UPDATE/DELETE ao anon e ao authenticated
--    (o default do Supabase). Uma view sem security_invoker executa a escrita com os privilégios do DONO
--    (postgres, que ignora RLS), então o RLS da tabela de baixo não protege. As bases são tabelas com RLS
--    e SEM nenhuma policy de escrita para o anon: sancoes (via v_sancionados), stf_decisoes
--    (stf_decisoes_busca), execucao_financeira_transferencias (transferencias_federais),
--    emendas_favorecidos/cam_frentes_membros (vw_religiao_emendas_organizacoes), sebrae_*, salic_*,
--    mg_*, agenda_*, narrative_events, cnpj_enriquecido.
--    Reproduzido num Postgres local: o anon altera e apaga linhas de uma tabela com RLS e sem GRANT de
--    escrita só passando por uma view sem security_invoker; a mesma operação por view com security_invoker
--    é negada. Logs da API do TF (1/10 a 5/10): ZERO requisições de escrita, de qualquer papel, em
--    qualquer dessas 20 views. Não há evidência de exploração; a janela dos logs é curta.
--    Correção: nenhuma view, matview ou tabela estrangeira é gravável por anon/authenticated. As views
--    continuam SECURITY DEFINER para LEITURA (é por design: publicam colunas de tabelas protegidas).
--
-- 2) FUNÇÕES SECURITY DEFINER EXECUTÁVEIS PELO ANON (rodam como dono, ignorando RLS):
--    distinct_dates, months_present   contam/listam datas de QUALQUER tabela do public, inclusive as
--                                     protegidas por RLS (sem injeção: usam %I e validam a coluna), com
--                                     varredura de até 60 s por chamada
--    computar_votacoes_agg            recomputa plen_deputado_agg (custo)
--    refresh_* (4)                    REFRESH MATERIALIZED VIEW CONCURRENTLY de views grandes (custo/lock)
--    limpar_ask_cache_expirado        apaga cache expirado
--    ask_quota_check_increment        já recusa quando auth.uid() <> p_user_id (anon não passa); só se
--                                     tira o EXECUTE do anon, o authenticated (app web) continua
--    Verificado: todos os chamadores usam a service role (workflows e scripts do tf-score) ou o pg_cron
--    (papel postgres); nenhuma chamada por RPC nas últimas 24 h. handle_new_user e
--    stf_vincular_assinatura_novo_usuario (funções de gatilho) ficam como estão: o PostgREST não as expõe
--    e o gatilho não depende do EXECUTE de quem dispara.
--
-- Não toca em policies, tabelas, nem na service role. Idempotente.
-- Copiar com: LC_ALL=en_US.UTF-8 pbcopy < arquivo.sql

begin;

-- 1. views, matviews e tabelas estrangeiras: sem escrita para anon e authenticated.
--    Em loop e tolerante: geometry_columns/geography_columns (PostGIS) são do supabase_admin e o
--    postgres do SQL Editor pode não conseguir alterá-las; avisa em vez de abortar a migration.
do $$
declare r record;
begin
  for r in
    select c.oid::regclass as rel, pg_get_userbyid(c.relowner) as dono
    from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm', 'f')
  loop
    begin
      execute format(
        'revoke insert, update, delete, truncate, references, trigger, maintain on %s from anon, authenticated',
        r.rel);
    exception when insufficient_privilege then
      raise notice 'sem permissão para revogar em % (dono %): conferir à parte', r.rel, r.dono;
    end;
  end loop;
end $$;

-- 2. funções: só a service role (e o pg_cron, que roda como postgres). `public` incluído de propósito:
--    função nasce com EXECUTE para PUBLIC e revogar só do anon não tira o que ele herda por aí.
revoke execute on function public.distinct_dates(text, text, date) from public, anon, authenticated;
revoke execute on function public.months_present(text, text) from public, anon, authenticated;
revoke execute on function public.computar_votacoes_agg(integer) from public, anon, authenticated;
revoke execute on function public.limpar_ask_cache_expirado() from public, anon, authenticated;
revoke execute on function public.refresh_almg_fornecedores_intersetados() from public, anon, authenticated;
revoke execute on function public.refresh_fornecedores_intersetados() from public, anon, authenticated;
revoke execute on function public.refresh_mv_scorecard_fornecedor_federal() from public, anon, authenticated;
revoke execute on function public.refresh_mv_siafi_fornecedores() from public, anon, authenticated;
-- o app web chama esta com a sessão do usuário logado: só o anon perde
revoke execute on function public.ask_quota_check_increment(uuid, integer) from public, anon;
grant execute on function public.ask_quota_check_increment(uuid, integer) to authenticated, service_role;

commit;

-- ── Conferência (rodar depois) ─────────────────────────────────────────────
-- 1) Esperado: 0 linhas (nenhuma view/matview gravável por anon ou authenticated; pode sobrar
--    geometry_columns/geography_columns se o aviso de permissão apareceu)
--    select c.relname, c.relkind, has_table_privilege('anon', c.oid, 'UPDATE') anon_upd, has_table_privilege('authenticated', c.oid, 'UPDATE') auth_upd
--    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('v','m','f')
--      and (has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE')
--        or has_table_privilege('authenticated', c.oid, 'INSERT') or has_table_privilege('authenticated', c.oid, 'UPDATE') or has_table_privilege('authenticated', c.oid, 'DELETE'));
-- 2) Esperado: 0 linhas (anon sem EXECUTE nessas funções); ask_quota_check_increment só para authenticated/service_role
--    select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('distinct_dates','months_present','computar_votacoes_agg','limpar_ask_cache_expirado','refresh_almg_fornecedores_intersetados','refresh_fornecedores_intersetados','refresh_mv_scorecard_fornecedor_federal','refresh_mv_siafi_fornecedores','ask_quota_check_increment')
--      and has_function_privilege('anon', p.oid, 'EXECUTE');
-- 3) Esperado: as views continuam LEGÍVEIS pelo anon (o site público depende disso)
--    select has_table_privilege('anon', 'public.v_sancionados', 'SELECT') as anon_le_v_sancionados;
