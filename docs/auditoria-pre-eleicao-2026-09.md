# Auditoria pré-eleição — ElectioLab

**Data:** 26/09/2026 · **Janela de risco:** 28/09 (ensaio TSE) → 25/10 (2º turno)
**Escopo:** somente leitura. Nada foi corrigido, nenhuma migration foi criada ou aplicada. Os SQLs de correção estão neste documento só como proposta; quem aplica é o Luiz, no SQL Editor (regra do `CLAUDE.md`).

**Legenda:** **P0** resolver antes de 28/09 · **P1** antes de 04/10 · **P2** depois de 25/10.

**Como verifiquei:** Supabase MCP (só `SELECT`, advisors, logs, `cron.*`), `vercel` CLI (`ls`, `inspect`, `env ls`, `project inspect`, API de team), `gh` (runs e deployments), leitura do código em `main`/`apuracao-2026`, e `curl` GET/HEAD em `electiolab.com`. Nenhuma escrita em produção. Duas chamadas de sonda merecem registro: um GET em `/api/admin/notifications/test` (que está aberta, ver P1-6) e GETs na REST do Supabase com a chave `anon` pública (schema `apuracao` e `agent_runs`), sem dado sensível retornado.

---

## Resumo executivo

| # | Sev. | Achado | Esforço |
|---|------|--------|---------|
| P0-1 | **P0** | `anon` consegue **inserir** em `candidates`, `election_results`, `tse_apuracao*`, `data_source_audit` (policy `WITH CHECK true`) e alterar/apagar `pesqele_registry` via 2 views | 1 migration curta |
| P0-2 | **P0** | 4 funções `SECURITY DEFINER` executáveis por `anon`; `check_api_quota_alerts()` devolve e-mail + user_id de clientes pagantes | 1 migration curta |
| P0-3 | **P0** | Policies de admin no RLS dependem de `auth.email()` de 2 e-mails que **não existem** em `auth.users`; se "Confirm email" estiver desligado, qualquer um se cadastra como admin | verificar no painel (1 min) |
| P0-4 | **P0** | Helpers de leitura ignoram `error` do Supabase: uma falha momentânea vira **página vazia cacheada** (1h; 7 dias em `/candidato/*`) | ~15 helpers em `src/lib/queries.ts` |
| P0-5 | **P0** | Vercel: `billing.status = "overdue"` no team de produção | verificar no painel (1 min) |
| P0-6 | **P0** | Monitoramento: nenhum uptime externo, `/api/health` é mock, workflows não falham em HTTP 5xx | 30–60 min |
| P0-7 | **P0** | `POST /api/tse/sync` sem autenticação, com `service_role` e `maxDuration = 300` | 1 guard |
| P1-1 | P1 | Supabase em compute **Micro** (60 conexões, ~1 GB RAM) com 17 GB de dados; cache hit de tabela 89,8% | decidir upgrade no ensaio |
| P1-2 | P1 | `candidates` (20 mil linhas) levou 8,7 bilhões de tuplas em seq scan (445 mil scans) | achar a query |
| P1-3 | P1 | Páginas `force-dynamic` e APIs públicas sem cache de CDN | `s-maxage` / ISR |
| P1-4 | P1 | Build depende do banco no prerender (2 deploys de produção falharam ontem); todo push em `main` é deploy de produção | congelar deploys + procedimento |
| P1-5 | P1 | Sem `error.tsx`/`not-found.tsx` próprios, sem página de contingência | páginas estáticas |
| P1-6 | P1 | `/api/alerts/anomaly` e `/api/admin/notifications/test` abertas (`WAVE4_API_KEY` não existe na Vercel) | env ou guard |
| P1-7 | P1 | 7 tabelas `sub_imob_*` com policy `ALL` para `public` com `qual = true` (hoje 0 linhas) | drop policy |
| P1-8 | P1 | Env vars que a apuração vai exigir (`TSE_*`, `APURACAO_ATIVA`) ainda não existem na Vercel | checklist de deploy |
| P1-9 | P1 | Seção CEAP em branco em produção: `ceaps_brutas` (banco TF) tem RLS sem policy e o site lê como `anon` (824/824 requisições em 24h → `[]`) | migration TF (MV agregada) + troca em `tf-data.ts` |
| P2 | P2 | Ver seção final (views definer, senha vazada, search_path, CI ruidoso, etc.) | |

**Boa notícia (o que está certo):** nenhuma `service_role` em código de cliente e nenhuma no repo/histórico (o único JWT commitado é `anon`); as 7 tabelas com RLS ligado e zero policies **não são lidas por nenhuma página pública** (não há risco de "site vazio" por elas); o `anon` tem `statement_timeout = 3s`; rotas `/api/debug/*` respondem 404 em produção; `/api/revalidate` e crons exigem token; backup diário está verde (9/9); os 7 jobs de `pg_cron` rodaram sem falha; CDN serve as páginas ISR em HIT.

---

## 1. Segurança

### P0-1 — Escrita anônima: policies `WITH CHECK (true)` e views graváveis

**Evidência** (`pg_policies` + `has_table_privilege('anon', …)`): o `anon` tem `INSERT` nas tabelas (grant padrão do Supabase) e existem policies de `INSERT` para o papel `public` com `with_check = true` em:

| Tabela | Linhas hoje | Quem lê |
|---|---|---|
| `candidates` (`candidates_insert`) | 20.245 | tudo; `is_active` **default `true`** → linha forjada já entra ativa |
| `election_results` (`election_results_insert`) | 6 | `/eleicao-2018`, `/eleicao-2022`, `candidate-view.tsx`, dashboard |
| `tse_apuracao`, `tse_apuracao_candidatos` (`allow_insert`) | 0 | órfãs (decisão de 26/09: não usar, não apagar) |
| `data_source_audit` (`data_source_audit_insert`) | 2 | auditoria |

A chave `anon` é pública por desenho (está no bundle e em `monitor-new-polls.yml`), então "quem tem a chave" = qualquer visitante. Impacto: candidato falso ativo em listagem, resultado oficial forjado em página de candidato, poluição de trilha de auditoria. **Não testei com escrita** (regra do repo); a conclusão vem de privilégio + policy, que é determinística.

Segundo vetor: as views `pesqele_missing_senador` e `pesqele_missing_deputado_federal` são `is_updatable = YES`, dono `postgres`, **sem** `security_invoker`, e o `anon` tem `INSERT/UPDATE/DELETE` nelas. Como rodam com os direitos do dono, contornam o RLS de `pesqele_registry` (3.185 linhas, base da cobertura de pesquisas TSE). Ou seja, dá para `UPDATE`/`DELETE` em `pesqele_registry` via `/rest/v1/pesqele_missing_senador`.

**Correção proposta** (não aplicada; ajustar nomes de policy se o painel mostrar diferente):

```sql
-- P0-1a: fechar INSERT anônimo (o ingest usa service_role, que ignora RLS)
drop policy if exists candidates_insert          on public.candidates;
drop policy if exists election_results_insert    on public.election_results;
drop policy if exists data_source_audit_insert   on public.data_source_audit;
drop policy if exists allow_insert               on public.tse_apuracao;            -- só a policy; tabela fica
drop policy if exists allow_insert               on public.tse_apuracao_candidatos; -- idem

-- P0-1b: views graváveis
revoke insert, update, delete on public.pesqele_missing_senador          from anon, authenticated;
revoke insert, update, delete on public.pesqele_missing_deputado_federal from anon, authenticated;
alter view public.pesqele_missing_senador          set (security_invoker = on);
alter view public.pesqele_missing_deputado_federal set (security_invoker = on);
```

Antes de aplicar: conferir que nenhum script legítimo usa a `anon key` para inserir (os scripts de ingest que li usam `service_role`). Depois de aplicar, rodar `get_advisors` e um `curl` de `POST` com a `anon` esperando 401/403.

### P0-2 — Funções `SECURITY DEFINER` executáveis por `anon`

Das 17 funções definer em `public`, 4 têm `EXECUTE` para `anon` e `authenticated` (as demais estão corretamente restritas):

| Função | Risco |
|---|---|
| `check_api_quota_alerts()` | **Vaza `user_id` + e-mail (`auth.users`) + uso** de chaves `pro/business/enterprise` acima de 80%. Hoje só retorna quem passou de 80% (pode estar vazio), mas é PII exposta por RPC |
| `mark_alert_sent(p_api_key_id, p_user_id)` | `UPDATE api_keys … WHERE id = … OR user_id = …` — o `OR` faz um `user_id` conhecido suprimir alertas de todas as chaves dele |
| `get_api_rate_limit(p_api_key_id)` | Lê limite/tier de qualquer chave por UUID |
| `check_ip_rate(...)` | Qualquer um consome/zera a cota de rate limit de um `ip_hash` alheio |

Nenhuma tem `search_path` fixo (advisor `function_search_path_mutable`).

```sql
revoke execute on function public.check_api_quota_alerts()                     from anon, authenticated, public;
revoke execute on function public.mark_alert_sent(uuid, uuid)                  from anon, authenticated, public;
revoke execute on function public.get_api_rate_limit(uuid)                     from anon, authenticated, public;
revoke execute on function public.check_ip_rate(text, text, integer, integer)  from anon, authenticated, public;
alter function public.check_api_quota_alerts()    set search_path = public, pg_catalog;
alter function public.mark_alert_sent(uuid, uuid) set search_path = public, pg_catalog;
alter function public.get_api_rate_limit(uuid)    set search_path = public, pg_catalog;
```

Confirmar antes que o app chama essas funções só via `supabaseAdmin` (`service_role` mantém `EXECUTE`). `api-auth.ts` e `ip-rate-limit.ts` estão na lista de arquivos com `supabaseAdmin`.

### P0-3 — Admin por e-mail no RLS, com os e-mails não cadastrados

Policies de `INSERT/UPDATE/DELETE` em `approval_polls` e `UPDATE` em `candidates` liberam quem tiver `auth.email()` = `admin@electiolab.com` ou `luiz@gastronomizae.com`. Consultei `auth.users` (230 usuários): **nenhum dos dois e-mails existe**. Se o cadastro por e-mail estiver aberto **e** "Confirm email" desligado, qualquer pessoa cria conta com esse e-mail e ganha escrita em `candidates` e `approval_polls`. Se a confirmação estiver ligada, o atacante não confirma a caixa postal e o risco cai a zero.

**Não consegui verificar** o estado dessa configuração (o MCP não expõe config de Auth, e criar conta de teste seria escrever em produção). **Ação (1 min):** Painel Supabase → Authentication → Providers → Email → "Confirm email" deve estar **ligado**. Se estiver desligado, é P0 crítico. Independente disso, o mais robusto é trocar `auth.email()` por `auth.jwt() -> 'app_metadata' ->> 'is_admin'` (mesma decisão do #69 no app), que o usuário não consegue autoatribuir.

Também: "Leaked password protection" está desligada (advisor) → P2.

### P0-7 — `POST /api/tse/sync` sem autenticação

`src/app/api/tse/sync/route.ts` não tem nenhum guard, usa clientes com `service_role` (via `tseSyncService`/`DiscrepancyManager`, que fazem `upsert/insert/update/delete`), chama o TSE e exporta `maxDuration = 300`. Qualquer visitante pode disparar sincronizações caras repetidas, gravar em `discrepancies` e bater no TSE a partir do IP da Vercel (o que pode gerar bloqueio do IP — relevante para a apuração). GET responde 400; **não fiz POST**.

**Correção:** exigir `Authorization: Bearer ${CRON_SECRET}` (padrão dos outros crons) ou remover a rota (`apps/pipeline` já é código morto). Aproveitar para checar a mesma classe em `/api/history/*`, `/api/polls/anomalies`, `/api/regions/aggregated`: são leituras, mas sem cache nem limite (ver P1-3).

### Verificações que passaram

- **`service_role` fora do servidor:** 37 arquivos (um é teste) usam `supabaseAdmin`/`SERVICE_ROLE`; nenhum é `"use client"`. `NEXT_PUBLIC_*` só expõe URL e `anon`.
- **Segredos no repo:** varredura em arquivos rastreados e no histórico completo: nenhum `sk_live`, `whsec_`, `re_`, `sbp_`, `sk-ant-`, string de conexão com senha. Único JWT encontrado é `role=anon` (3 ocorrências: `monitor-new-polls.yml`, `query-dups.ts`, `query-dups-detailed.ts`). `.env*` está no `.gitignore` e nunca foi commitado. **Recomendo mesmo assim** que `varredura-segredos` rode antes do merge da apuração, porque `.env.local` existe em disco com `SUPABASE_SERVICE_ROLE_KEY`.
- **RLS ligado sem policy** (`agent_alert_rules`, `agent_runs`, `aggregation_history`, `candidates_tse_stamp_backup_20260831`, `discrepancies`, `webhook_logs`, `webhook_queue`): confirmei por grep que **nenhuma página pública** lê essas tabelas; `agent_runs`, `webhook_*` e `discrepancies` só via `service_role`. Um `GET` com `anon` em `agent_runs` retorna `[]` (bloqueado, como esperado). Sem risco de site vazio por elas. As três de `apuracao` (`arquivo_bruto`, `coletor_execucao`, `url_quarentena`) também são só de serviço, por desenho.
- **Tabelas expostas ao `anon` para leitura:** todas as `SELECT true` são dados públicos (pesquisas, candidatos, TSE). `api_keys` é restrita ao dono (`auth.uid() = user_id`), `user_alerts` idem. Schema `apuracao` está exposto na API (200) com leitura pública — esperado.
- **`/api/debug/*`:** 404 em produção (guard `debug-guard.ts`). `/api/revalidate` 401 sem token. Crons exigem `CRON_SECRET`. Webhook do Stripe valida assinatura.

---

## 2. Deploy

### Estado atual

| Item | Situação |
|---|---|
| Produção atual | `dpl_B5xMbMcb8gZu9U1yMAHHv8bhyAcD` (`electiolab-khk7gvgfi…`) **Ready**, 26/09 08:36 (-03), serve `electiolab.com`, `www`, `electiolab.vercel.app` |
| Em andamento | outro deploy de produção estava em **Building** durante a auditoria (verificar que terminou Ready) |
| #69 (admin `app_metadata`), #70 (plano manual + guard Stripe), #71 (timeout 2018/2022) | **Os três estão em `origin/main`** (`7f6631b`, `0560b59`, `dc806e6`) e a produção atual é posterior a eles → no ar |
| `apuracao-2026` | **Não está em `main`** nem em produção: `/apuracao` responde 404 |
| Plano | Vercel **Pro** (cron por minuto e `maxDuration` 300 permitidos) |
| Deploys de produção com erro nas últimas 24h | 2 (20:12 e 21:10 de 25/09), ambos `statement_timeout` no prerender de `/eleicao-2018/*` — corrigido em #71; desde então, todos Ready |

### P0-5 — Cobrança da Vercel "overdue"

A API do team retorna `billing.status = "overdue"` (plano Pro). Em atraso a Vercel pode restringir/pausar o projeto. **Ação:** vercel.com → Settings → Billing, regularizar e conferir o método de pagamento **antes de 28/09**. Não reproduzo aqui os dados de cobrança.

### Variáveis de ambiente (produção)

Presentes: Supabase (URL, anon, service_role), Stripe (4), Resend (2), `CRON_SECRET`, `CRON_JOB_TOKEN`, `REVALIDATE_TOKEN`, `INGEST_SECRET_KEY`, `ADMIN_EMAILS`, `ADMIN_EMAIL`, Sentry DSN (2), `TF_SUPABASE_*`, `BEEHIIV_*`, `NEXT_PUBLIC_GA_ID`.

Usadas no código e **ausentes** na Vercel (production):

| Var | Consequência |
|---|---|
| `WAVE4_API_KEY` | `/api/alerts/anomaly` fica **aberta** (P1-6) |
| `SLACK_WEBHOOK_URL`, `EMAIL_API_KEY`, `EMAIL_PROVIDER`, `EMAIL_FROM` | notificações Slack/e-mail do orquestrador ficam desativadas silenciosamente → não há alerta operacional por esse canal |
| `SENTRY_AUTH_TOKEN` | build sem `withSentryConfig`: sem source maps, sem `tunnelRoute` (`next.config.ts` desliga quando ausente). Erros ainda chegam ao Sentry, com stack minificada |
| `DEBUG_TOKEN` | ok, cai para `CRON_SECRET` |
| `TEST_API_KEY` | rotas `/api/institutes/test-*` respondem 503 (ok) |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` | têm fallback `https://electiolab.com` (verifiquei: sem erro de digitação) |
| `KV_REST_API_*`, `LAMBDA_*`, `MAILGUN_DOMAIN`, `SCRAPER_API_KEY`, `DATABASE_URL`, `BASIC_AUTH_*` | caminhos legados/opcionais; `BASIC_AUTH_*` ausente é o correto (site público) |

### P1-8 — Pré-requisitos da apuração ainda não existem na Vercel

Antes do merge de `apuracao-2026`: `TSE_AMBIENTE`, `TSE_BASE_SIMULADO`, `TSE_AMB_SIMULADO`, `TSE_BASE_OFICIAL`, `TSE_AMB_OFICIAL`, `TSE_MAX_REQ_POR_SEG`, `APURACAO_ATIVA` e a entrada de cron por minuto em `vercel.json` (hoje só há `run-agent-1` diário e `check-polls` semanal). A migration `20260927120000_apuracao_schema.sql` **já está aplicada** (as tabelas `apuracao.*` existem e o advisor as lista): confirme que o arquivo no repo corresponde ao que foi aplicado.

### E se um build falhar na semana da eleição?

- **O que acontece:** o deploy que falha **não substitui** o de produção; o site continua no último Ready. O problema não é derrubar o site, é **não conseguir publicar** correção/dado (ex.: curadoria de pesquisa) enquanto o build estiver quebrado.
- **Por que é plausível:** o prerender consulta o Supabase. Ontem `statement_timeout` (57014) derrubou 2 builds de produção. #71 corrigiu 2018/2022 (`generateStaticParams` vazio + índice `idx_prior_election_results_year_round_state`), mas o padrão continua: qualquer página com `generateStaticParams` que consulte tabela grande pode repetir o problema, e o banco é Micro (P1-1). São 10 rotas com `generateStaticParams`.
- **Cada push em `main` vira deploy de produção** (as curadorias diárias incluídas). Em 26/09 houve 5 deploys de produção em ~16h.

### Rollback em 1 minuto

Deployment de referência (produção estável agora): `electiolab-khk7gvgfi-luiz-lessas-projects.vercel.app`. Anterior estável: `electiolab-2zqz3sqtj-luiz-lessas-projects.vercel.app` (Ready, ~7h antes).

Pelo painel: vercel.com → electiolab → **Deployments** → escolher o último `Production · Ready` bom → **⋯ → Instant Rollback**. Pela CLI (já logada como `luizlessa-dev`):

```bash
vercel ls electiolab --scope luiz-lessas-projects        # achar o último "Production ● Ready" bom
vercel rollback <url-do-deployment> --scope luiz-lessas-projects
```

Atenção (comportamento documentado da Vercel, confirme no painel quando usar pela primeira vez): depois de um rollback, os domínios de produção **deixam de ser atribuídos automaticamente** aos novos deploys. Um `git push` posterior **não** entra no ar até você **promover** o novo deploy (`vercel promote <url>`) ou reativar a atribuição automática. Isso protege contra reaparecer o bug, mas surpreende quem esquece. Rollback não desfaz mudança de banco: migration aplicada fica aplicada.

**Recomendação (P1-4):** durante 27–29/09, 03–05/10 e 24–26/10, congelar merges que não sejam curadoria de dados, e rodar um `next build` local (ou o preview da branch) antes de cada merge que toque em página com `generateStaticParams`. Testar o rollback uma vez a seco em 27/09.

---

## 3. Capacidade

### Vercel (Pro)

- **Crons:** 2 em `vercel.json` (`run-agent-1` diário 08:00 UTC, `check-polls` semanal). A apuração planeja 1/min — Pro permite. As rotas `cron/aggregation-snapshots`, `cron/tse-sync` e `cron/ingest-pesqele` **não têm agendador em `vercel.json`**; não localizei quem as chama (P2: confirmar se são chamadas por GitHub Actions ou se estão órfãs).
- **Duração:** `vercel.json` fixa `maxDuration: 60` para `src/app/api/**`; `tse/sync` exporta 300. Não sei qual prevalece no deploy (P2). Para a apuração, o `arquitetura.md` já assume 60s por ciclo (≈200 requisições a 5 req/s ≈ 40s): margem curta; dividir por eleição como o próprio doc prevê.
- **Banda/requests:** 1.313 itens de saída, sitemap 3,6 MB (19,4 mil URLs). Páginas ISR saem do CDN (HIT). Sem dado de uso para projetar banda de noite de eleição; o pico realista é leitura de páginas ISR (barato). Como a conta está `overdue` (P0-5), o limite prático hoje é financeiro.

### Supabase (projeto `ElectioLab`, sa-east-1)

| Métrica | Valor | Leitura |
|---|---|---|
| Compute | `max_connections = 60`, `shared_buffers` 256 MB, `effective_cache_size` 768 MB → **Micro** | 17 GB de dados para ~1 GB de RAM |
| Conexões agora | 32 ativas: 21 do PostgREST (pool), 1 mgmt-api, 2 supabase_admin | folga existe, mas o pool do PostgREST é o gargalo, não a Vercel |
| Timeouts | `anon` 3s, `authenticator` 8s, global 120s, `service_role` sem override | `anon` está protegido; **`service_role` não tem limite** (build e crons usam) |
| Tamanho | 17 GB. `candidate_expense_contracted` 7,6 GB, `candidate_expense_paid` 4,6 GB, `candidate_revenue*` 4,8 GB, `prior_election_results` 1 GB | tabelas de prestação de contas dominam o banco |
| Cache hit | tabelas **89,8%**, índices 98,2% | abaixo do ideal (≥99%); sintoma de RAM curta |
| `pg_cron` | 7 jobs ativos, **0 falhas em 14 dias** | ok |
| Backup | GitHub Action diária, 9/9 sucesso (último 26/09 08:23 UTC) | ok (incidente do token R2 resolvido em 12/09) |

### P1-1 — Compute Micro na noite de eleição

Com ISR cobrindo a leitura, a maior parte do tráfego não chega ao banco. Mas: (a) páginas dinâmicas e APIs públicas chegam (P1-3); (b) a apuração vai escrever a cada minuto; (c) qualquer revalidação de ISR em massa (`/api/revalidate?path=ALL`, 19,4 mil URLs de candidato) vira rajada de leituras; (d) 89,8% de cache hit indica disco no caminho. **Recomendo** subir para Small ou Medium na véspera de 04/10 (é reversível; reinício de ~1 min — fazer em horário morto) e **medir no ensaio de 28/09** (CPU, conexões, `pg_stat_statements`) antes de decidir. Se ficar em Micro, no mínimo dar `statement_timeout` explícito ao `service_role` e não rodar ingest pesado em horário de pico.

### P1-2 — Consulta quente em `candidates`

`pg_stat_user_tables`: `candidates` (20.245 linhas) tem **445.853 seq scans e 8,7 bilhões de tuplas lidas**; `candidate_social_media` 85.794 seq scans. Uma tabela pequena lida assim consome CPU constante do Micro. Provável origem: busca por nome/slug com `ilike`/`or`, ou o `auth.email()` sem índice nos caminhos de RLS. **Ação:** ativar `pg_stat_statements` (se não estiver) e olhar as 5 queries de maior `total_exec_time` durante o ensaio; adicionar índice (`pg_trgm` para busca por nome, `slug`, `(election_id, is_active)`).

### P1-3 — Páginas e endpoints sem cache

Verificado por `curl` (`x-vercel-cache`): `/candidatos` e `/mapa` retornam `private, no-store` + **MISS**; `/api/v1/elections` MISS. Outras rotas `force-dynamic`: `/comparar`, `/embed/eleicao/[id]`, `/eleicao-2018` e `/eleicao-2022` (índices). Endpoints públicos sem auth que consultam o banco a cada chamada: `/api/polls/aggregated`, `/api/approval/aggregated`, `/api/v1/elections/[id]/weight-analysis`, `/api/history/*`, `/api/regions/aggregated`, `/api/polls/anomalies`. **Ação:** `Cache-Control: s-maxage=60, stale-while-revalidate=300` nas rotas de leitura pública e ISR curto onde couber. Priorizar `/candidatos`, `/mapa`, `/embed/eleicao/[id]` (embeds em sites de terceiros multiplicam tráfego).

### P0-4 — Página vazia cacheada quando o banco falha

`src/lib/queries.ts` tem 15 helpers no formato `const { data } = await supabase…; return data ?? []` (nenhum lê `error`). Se o Supabase der timeout/erro **durante uma regeneração ISR**, a página é renderizada com lista vazia (ou `notFound()` em `getElectionById`) e **essa versão substitui a boa no cache**: 1 hora para as páginas de agregação, **7 dias** para `/candidato/[slug]` (`revalidate = 604800`). É exatamente o cenário "site vazio / dado errado" em noite de carga. A correção é pequena: `if (error) throw error` nos helpers usados por páginas ISR, porque quando a regeneração lança, o Next mantém a versão anterior em cache. (`historic-elections.ts` já faz `throw`.) Combinar com P1-1: quanto mais lento o banco, mais provável.

---

## 4. Dependências externas

| Se ficar fora/lento… | Efeito hoje | Fallback existente? |
|---|---|---|
| **TSE** | Sem efeito imediato no site (dados entram por GitHub Actions diários e `pg_cron`). Na noite de eleição, o coletor da apuração depende dele | Design da apuração prevê ETag/304 e quarentena de 404; falta definir "último snapshot bom" na UI e o que exibir se o TSE ficar 5+ min sem novidade |
| **Supabase** | Páginas ISR em cache continuam (HIT). `force-dynamic`, APIs, login e Stripe/newsletter falham. Regeneração ISR pode **cachear página vazia** (P0-4) | Nenhum. Sem réplica, sem página estática de contingência |
| **Vercel** | Site inteiro fora. Sem CDN secundário nem DNS de contingência | Nenhum |
| **Resend / Stripe / Sentry** | E-mails/assinaturas/alertas param; site principal segue | Não crítico para o público |

**P1-5:** não há `error.tsx`, `not-found.tsx` nem `loading.tsx` em `src/app`; o `global-error.tsx` renderiza o `NextError` padrão em inglês (`<html lang="en">`). Um `curl` em `/pagina-inexistente` retorna 404 com ~16 KB de HTML (o 404 padrão do Next, sem marca do site). Proposta mínima: `error.tsx` e `not-found.tsx` em PT-BR com link para `/` e para as páginas agregadoras; uma página `public/contingencia.html` estática para trocar por rewrite se o banco cair. **P2:** assinar o status da Vercel e do Supabase (e-mail/RSS) e ter à mão o telefone de quem aprova mudança de DNS.

---

## 5. Monitoramento — hoje você não saberia em minutos

### P0-6 — O que existe e o que falta

**Existe:** Sentry (DSN em produção, `tracesSampleRate 0.05`); Vercel Analytics/Speed Insights; e-mail padrão do GitHub para workflows que falham; tabela `agent_runs`/`quota_alert_runs`.

**Falta / engana:**

1. **Nenhum uptime externo.** Não há UptimeRobot/BetterStack/Checkly no repo nem nos docs. Se o site cair às 19h de 04/10, você descobre por usuário.
2. **`/api/health` é mock:** o código marca os 3 agentes como `healthy` com `last_run` fabricado (`Date.now() - 1h`) e a seção "TSE CDN" nunca é checada. Um monitor apontado para ele daria verde mesmo com pipeline parado. Só o ping em `pesqele_registry` é real. Leva ~2,5s.
3. **Workflows não falham em HTTP de erro:** `quota-alerts-daily.yml` usa `curl -X GET … -w` sem `--fail`; um 401/500 termina com exit 0 e o job fica verde. Mesma classe do incidente do backup R2 (43 dias sem backup, memória `backup-supabase-r2-token-incidente`).
3b. `monitor-new-polls.yml` não monitora saúde: abre issue quando **há** pesquisa nova (ruído) e usa `anon` com `institute_id=eq.8/2` fixos.
4. **Nada avisa falha de `pg_cron`** (hoje 0 falhas, mas ninguém olha `cron.job_run_details`). O `recalculate-averages-every-6h` alimenta as médias exibidas: se parar, o site publica média velha sem alarme.
5. **CI ruidoso:** `E2E Tests` 8 falhas em 53 runs e `smoke-tests` 12 em 45 desde 12/09 — falha vira rotina e passa a ser ignorada. O smoke também **dispara `/api/test-sentry?confirm=YES` em produção a cada push** (gera erro 500 real no Sentry) e assina newsletter com e-mail descartável: polui a taxa de erro e a base de assinantes (210).
6. **Sem alerta de frescor de dado:** nada compara `max(created_at)` de `polls`/`weighted_averages` com o relógio.

### Proposta mínima (30–60 min, antes de 28/09)

- Uptime externo (gratuito) com alerta por push/SMS: `/` , `/eleicoes/sp`, `/candidato/lula`, `/api/v1/elections` e, quando existir, `/apuracao`. Intervalo de 1 min, alerta após 2 falhas.
- Trocar `/api/health` por um check real e barato: `select 1` + idade de `max(created_at)` em `polls` e `weighted_averages` (HTTP 503 se > 12h); remover o mock. Apontar o uptime para ele.
- `--fail-with-body` nos `curl` dos workflows.
- Alerta de Sentry por e-mail/push para "nova issue em produção" e "taxa de erro > x/min"; configurar `SENTRY_AUTH_TOKEN` (source maps e tunnel); tirar o `test-sentry` do smoke de produção.
- Consulta de saúde para rodar de cabeça durante o ensaio:

```sql
select jobname, max(start_time) last_run,
       count(*) filter (where status='failed' and start_time > now() - interval '1 day') fails_24h
from cron.job j join cron.job_run_details d using (jobid) group by 1;
select max(created_at) from public.polls;
```

- Logs: Vercel → Logs (filtros `[quota-alerts]`, `[stripe webhook]`); Supabase → Logs/Advisors; `query_logs` do MCP retornou vazio para `edge_logs` e `postgres_logs` nas últimas 24h, o que sugere coleta desligada ou fonte com outro nome (P2: conferir no painel de logs do Supabase).

---

## P1 — demais achados

- **P1-6 — Rotas abertas por falta de env:** `/api/alerts/anomaly` (`POST`): só exige chave `if (!isAuthed && process.env.WAVE4_API_KEY)`; como `WAVE4_API_KEY` **não existe** na Vercel, a rota aceita qualquer chamada, grava discrepância com `service_role` e aceita `emailRecipients` no corpo (hoje inerte porque `EMAIL_*` também não existe, mas passa a ser relay de e-mail no dia em que alguém configurar). Rate limit é em memória (200/min por instância, contorna com concorrência). `/api/admin/notifications/test` (`GET`) responde 200 sem auth (verifiquei). Corrigir: exigir `CRON_SECRET`/`ADMIN` nas duas.
- **P1-7 — `sub_imob_*` (7 tabelas):** policy `service_role_all` está com papel `public`, `qual = true`: **qualquer** `anon` lê, grava e apaga (`sub_imob_pessoas` tem `cpf_cnpj`; `sub_imob_consultas` tem e-mail). Hoje 0 linhas em todas, então não há vazamento, só superfície. Pertencem a outro produto no mesmo banco: `drop policy service_role_all` em cada uma (ou `to service_role`) e, na pós-eleição, mover para outro projeto. As policies `*_service_role` de `custom_quotas`, `payment_failures`, `quota_alert_runs`, `quota_change_logs`, `subscription_changes` também estão como `public`, mas condicionadas a `auth.role() = 'service_role'` — efetivas, só com o aviso de performance `auth_rls_initplan` (P2).

- **P1-9 — Seção CEAP em branco (banco Transparência Federal, `redggdtakzmsabwvjzhb`):** achado da auditoria do banco compartilhado, complementa este relatório. `src/lib/tf-data.ts` consultava `ceaps_brutas` (1,4 mi linhas, 1,1 GB) com a `TF_SUPABASE_ANON_KEY`; a tabela tem RLS ligado e nenhuma policy, então o PostgREST responde 200 com `[]`, sem erro. `getCeapByCamaraId()` recebe vazio e devolve `null`, a seção some do `/candidato/[slug]` (deputados federais), e `/cota-parlamentar` mostra "Dados ainda em sincronização". Falha silenciosa: nenhum log de erro, porque o status é 200.
  - **Decisão:** não abrir `ceaps_brutas` ao `anon` (a linha crua inclui CPF de fornecedor pessoa física sem máscara, `url_documento` e jsonb `dados`).
  - **`/cota-parlamentar` — sem migration:** já existe a tabela `ceaps_ranking` (policy `anon: public read`, 2.057 linhas, atualizada em 17/09). Conferi que o total de 2025 bate com `ceaps_brutas` (R$ 256.581.818, 515 deputados). A consulta antiga (top 5.000 linhas por valor, agregadas no cliente) daria totais errados mesmo se a RLS permitisse. `getTopCeapSpenders` passou a ler `ceaps_ranking`; funciona hoje, antes de aplicar qualquer coisa.
  - **`/candidato/[slug]` — migration em `supabase/migrations/20260926130000_tf_ceap_resumo_deputado.sql` (não aplicada, **aplicar no projeto TF**):** view **materializada** `public.ceap_resumo_deputado`, 1 linha por deputado (~540), com só o que a tela renderiza: `total_24m`, `total_12m`, `por_tipo` (top 10) e `top_fornecedores` (top 10), mais `janela_inicio`/`atualizado_em`. `GRANT SELECT` só para `anon` e `authenticated` (revoga o `ALL` padrão), índice único por `deputado_id_externo` (também habilita `REFRESH CONCURRENTLY`) e job `pg_cron` diário `refresh-ceap-resumo` (09:30 UTC; ajustar ao horário da ingestão, que não localizei). `recent` (20 despesas com `url_documento`) era calculado mas nenhuma página o renderiza, então não é publicado.
  - **Por que materializada:** view comum com `security_invoker` exigiria `SELECT` do anon na tabela crua; view `SECURITY DEFINER` contorna o RLS (mesmo padrão do advisor ERROR do P0) e agregaria 1,4 mi de linhas por request (medi ~4,2 s só no `SUM` da janela); RPC `SECURITY DEFINER` é o padrão que o P0-2 manda revogar do anon. MV não tem RLS nem `security_invoker`: a proteção é o conteúdo agregado + grant explícito. O advisor vai listá-la como WARN (`materialized_view_in_api`), aceito.
  - **Validado só com `SELECT` (nada criado):** o corpo da MV rodado como consulta devolve 540 linhas, soma 24 m de R$ 415.527.004, igual à tabela crua, sem duplicatas; deputado 220554: 2.904 documentos, R$ 798.049,91, idêntico ao cru.
  - **Mudanças de comportamento a aprovar:** (1) janela real de 24 meses (o código antigo usava as 2.000 linhas mais recentes, que truncava os de maior volume, até 2.904 documentos); (2) fornecedor pessoa física (CPF, 2.749 linhas na janela) sai como `cnpj = null`, e o cruzamento CEAP × CEIS deixa de casar CPF; (3) fornecedores agrupados por CNPJ quando há, não só por nome.
  - **Ordem de deploy:** o código novo é seguro antes da migration (sem a MV, a consulta cai no mesmo `null` de hoje). Aplicar a migration, rodar as verificações no rodapé do arquivo, depois fazer o deploy.
  - **Para não repetir:** `tfFetch` engole `!res.ok` e a RLS devolve `[]` com 200, então nada alerta. Incluir no check de saúde (P0-6) uma leitura de `ceap_resumo_deputado` de um deputado conhecido e falhar se vier vazia.

---

## P2 — depois de 25/10

- Views `SECURITY DEFINER` sem `security_invoker` (advisor ERROR ×7): `candidatos_oficiais_2026` (expõe `cpf`), `candidate_net_worth`, `institute_accuracy_summary`, `pesqele_coverage`, `pesqele_financiamento`, e as duas `pesqele_missing_*` (que já entram em P0-1). Avaliar remover `cpf` de `candidatos_oficiais_2026` ou tornar `security_invoker`. Os dados-base já são públicos, então o risco é baixo.
- Auth: ligar "Leaked password protection"; migrar `auth.email()` das policies para `app_metadata` (ver P0-3).
- `unaccent` e `pg_net` instalados em `public` (advisor).
- 87 índices não usados e 28 FKs sem índice (advisors de performance); `candidates_tse_stamp_backup_20260831` sem PK e sem policy: remover depois da eleição.
- `initplan` nas 5 policies `auth.role()` (usar `(select auth.role())`).
- Conflito `vercel.json maxDuration 60` × `export const maxDuration = 300`; crons órfãs `cron/*`.
- JWT `anon` hard-coded em `monitor-new-polls.yml`, `query-dups*.ts` (público por desenho, mas melhor ler de secret/env e apagar os scripts soltos da raiz).
- `send-quota-alerts` recebe o token na query string (`?token=`), que fica em log de acesso; preferir header `Authorization`.
- Tabelas de prestação de contas (≈17 GB, 4 tabelas) podem sair para outro projeto/particionar depois da eleição.
- Considerar uma segunda linha de defesa de Vercel: CDN de contingência para uma página estática de resultados (snapshot JSON no R2).

---

## O que **não** verifiquei

- **Escrita anônima real** (P0-1, P0-3): conclusão por privilégios/policies; não escrevi nada nem criei conta.
- **Configuração de Auth** (confirmação de e-mail, providers, redirect URLs): o MCP não a expõe.
- **Uso/banda da Vercel e limites de faturamento** (a API retornou só metadados de plano).
- **Carga real:** não rodei teste de carga contra produção; as conclusões de capacidade vêm de configuração, estatísticas do Postgres e cabeçalhos de cache.
- **Regras de alerta do Sentry** e destinatários (não há API no ambiente).
- **`apps/pipeline`** (código morto segundo o `arquitetura.md`) e o comportamento de `cron/*` sem agendador.
- **Logs do Supabase:** as consultas por `edge_logs`/`postgres_logs` voltaram vazias.

---

## Ordem sugerida até 28/09

1. (2 min) Painel Supabase: **Confirm email** ligado? (P0-3) · Vercel: **billing overdue** (P0-5).
2. (15 min) Uma migration com P0-1 + P0-2 (SQL acima), aplicada por você; rodar `get_advisors` e testar `POST` anônimo → deve falhar.
3. (10 min) Guard em `/api/tse/sync`, `/api/alerts/anomaly`, `/api/admin/notifications/test` (P0-7, P1-6).
4. (30 min) `throw` em `error` nos helpers ISR de `src/lib/queries.ts` (P0-4) + testes.
5. (30–60 min) Uptime externo + `/api/health` real + `--fail` nos workflows (P0-6).
6. No ensaio de 28/09: medir CPU/conexões e `pg_stat_statements` para decidir P1-1/P1-2; testar rollback a seco.
