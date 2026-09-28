-- P0-1 + P0-2 da auditoria pré-eleição (docs/auditoria-pre-eleicao-2026-09.md).
--
-- ACHADO AO VIVO (28/09/2026, confirmado por leitura direta do banco antes de
-- escrever este arquivo): a maior parte do que a auditoria de 26/09 descreveu
-- já foi corrigida por fora deste repositório, entre a auditoria e hoje:
--
--   - P0-1a (policies de INSERT com with_check=true em candidates,
--     election_results, tse_apuracao, tse_apuracao_candidatos,
--     data_source_audit): as policies não existem mais. Hoje só há policies
--     de SELECT (e a de UPDATE administrativa em candidates). Confirmado via
--     pg_policies.
--   - P0-1b (views pesqele_missing_senador / pesqele_missing_deputado_federal
--     graváveis, sem security_invoker): já têm security_invoker=on
--     (reloptions) e o REVOKE de INSERT/UPDATE/DELETE de anon/authenticated
--     já foi aplicado (hoje só têm SELECT/REFERENCES/TRIGGER/TRUNCATE).
--     pesqele_registry (tabela base) só tem a policy service_role_full_access
--     — anon/authenticated não têm policy nenhuma, logo zero acesso, direto
--     ou via view.
--   - P0-2 (4 funções SECURITY DEFINER executáveis por anon/authenticated):
--     já revogado. has_function_privilege confirma anon=false e
--     authenticated=false para check_api_quota_alerts, mark_alert_sent,
--     get_api_rate_limit e check_ip_rate; só service_role executa.
--
-- LOGS (edge_logs, 21/09 a 28/09 — 7 dias completos, no request.method IN
-- (POST,PATCH,PUT,DELETE) nas 5 tabelas + 2 views + 4 funções acima):
--   - Zero escrita anônima bem-sucedida em qualquer uma.
--   - UMA tentativa real: POST anônimo em /rest/v1/candidates, 27/09 23:43:21
--     UTC, rejeitado com HTTP 401. Não sabemos se foi bot de varredura ou
--     teste manual, mas é sondagem ativa nesse endpoint específico, não
--     hipótese. Retenção de log confirmada por amostragem em >=28 dias
--     (checado em -0,-1,-2,-3,-6,-7,-13,-14,-27,-28 dias, todos com dado).
--
-- O QUE ESTA MIGRATION FAZ (o que sobrou pra fazer):
-- as 5 tabelas base ainda têm GRANT de INSERT/UPDATE/DELETE para
-- anon/authenticated no nível de tabela (o grant padrão do Supabase) — hoje
-- inofensivo porque RLS está ligado e não há policy permissiva de escrita,
-- mas é uma segunda camada que vale fechar: se alguma policy permissiva for
-- adicionada por engano no futuro (ou RLS for desligado), o grant de tabela
-- deixaria de ser a rede de segurança que falta. Sem isso, revogado agora,
-- ninguém sem querer reabre a escrita anônima só criando uma policy solta.

-- ── Verificação ANTES de aplicar (rode e confira o resultado) ──────────────
-- select grantee, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name in ('candidates','election_results','tse_apuracao','tse_apuracao_candidatos','data_source_audit')
--   and grantee in ('anon','authenticated')
--   and privilege_type in ('INSERT','UPDATE','DELETE')
-- order by table_name, grantee, privilege_type;
-- -- Esperado: 30 linhas (5 tabelas x 2 papéis x 3 privilégios).

begin;

revoke insert, update, delete on public.candidates             from anon, authenticated;
revoke insert, update, delete on public.election_results       from anon, authenticated;
revoke insert, update, delete on public.tse_apuracao            from anon, authenticated;
revoke insert, update, delete on public.tse_apuracao_candidatos from anon, authenticated;
revoke insert, update, delete on public.data_source_audit       from anon, authenticated;

commit;

-- ── Verificação DEPOIS de aplicar ───────────────────────────────────────────
-- select grantee, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name in ('candidates','election_results','tse_apuracao','tse_apuracao_candidatos','data_source_audit')
--   and grantee in ('anon','authenticated')
--   and privilege_type in ('INSERT','UPDATE','DELETE')
-- order by table_name, grantee, privilege_type;
-- -- Esperado: 0 linhas.
--
-- select has_table_privilege('anon', 'public.candidates', 'INSERT');
-- -- Esperado: false.
--
-- Teste funcional (fora do SQL Editor, com a anon key pública):
--   curl -i -X POST 'https://xoxztzologqeqbajlhya.supabase.co/rest/v1/candidates' \
--     -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>" \
--     -H "Content-Type: application/json" -d '{"name":"teste-p0-1"}'
--   Esperado: 401/403 (já era antes desta migration, por causa da RLS; depois
--   dela, continua 401/403 mesmo se alguém adicionar uma policy solta de
--   INSERT sem querer, porque o grant de tabela não existe mais).
