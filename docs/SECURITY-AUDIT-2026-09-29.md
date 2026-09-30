# Audit de Segurança - 2026-09-29

## ✅ Implementado

### 1. Headers de Segurança (next.config.ts)
- `X-Content-Type-Options: nosniff` — previne MIME type sniffing
- `X-Frame-Options: DENY` — previne clickjacking
- `X-XSS-Protection: 1; mode=block` — proteção XSS
- `Referrer-Policy: strict-origin-when-cross-origin` — controla vazamento de referrer
- `Permissions-Policy` — desabilita geolocation, microphone, camera

### 2. Middleware Global (middleware.ts)
- Aplica headers de segurança em TODAS as requisições
- Matcher configurado para ignorar assets estáticos

### 3. Proteção de Rotas
- ✅ `/admin/*` — autenticação Supabase + verificação de role admin
- ✅ `/api/health*` — proteção com `HEALTH_CHECK_KEY` (opcional)
- ✅ `/api/admin/*` — requerem API key
- ✅ `/api/cron/*` — protegidas por Vercel Cron
- ✅ `/api/debug/*` — bloqueadas em produção

### 4. Validação de Inputs (src/lib/validation/api-schemas.ts)
- Schemas Zod centralizados para rotas críticas
- Schemas criados para: revalidate, health, discrepancies, poll ingestion, stripe, tse-sync

### 5. Secrets
- ✅ `.gitignore` configurado corretamente — `.env*` ignorado
- ✅ Nenhum arquivo .env ou chave commitada no git

## 🔍 Row Level Security (RLS) - Status

### Tabelas com RLS ATIVADO:
- `newsletter_subscribers` — leitura/escrita via service_role
- `api_keys` — controle de acesso a chaves
- `custom_quotas` — acesso baseado em permissões
- `quota_change_logs` — auditoria
- `candidate_revenue` — dados financeiros
- `candidate_revenue_original_donor`
- `candidate_expense_paid`
- `candidate_expense_contracted`
- `candidates` — dados de candidatos
- `approval_polls` — pesquisas de aprovação

### Tabelas CRÍTICAS sem RLS verificado:
- `polls` — dados de pesquisas (talvez intencional ser público)
- `weighted_averages` — agregações (público?)
- `elections` — informações de eleições
- `polling_institutes` — institutos de pesquisa

**Recomendação:** Verificar se `polls` e `weighted_averages` devem ser públicas ou ter RLS.

## 📋 TODO - Próximos Passos

1. **Aplicar Validação Zod nas rotas**
   - Usar `RevalidateQuerySchema` em `/api/revalidate`
   - Usar `TseSyncParamsSchema` em `/api/tse/sync`
   - Usar `PollIngestionSchema` em `/api/admin/ingest`
   - Outros endpoints que aceitam input

2. **Revisar RLS nas tabelas públicas**
   - Definir se `polls` e `weighted_averages` devem ser públicas
   - Se públicas, adicionar policy de leitura
   - Se privadas, adicionar RLS e policies restritivas

3. **CORS Configuration**
   - Revisar se há necessidade de CORS configurado
   - Verificar dados sensíveis expostos via API pública

4. **Rate Limiting Aprimorado**
   - Implementar rate limiting global (não só em auth.ts)
   - Proteger rotas de cron contra abuso
   - Proteger `/api/revalidate` contra floods

5. **Monitoramento**
   - Logs de tentativas de acesso a `/admin`
   - Alertas para múltiplas falhas de autenticação
   - Revisão periódica de logs de segurança

## 🔐 Segredos Checados
- ✅ Nenhuma chave/token em arquivos commitados
- ✅ `.env.local` e variáveis sensíveis ignoradas
- ✅ Service role key salvo em env vars apenas
- ⚠️ CRON_SECRET em uso — certifique-se que está forte e renovado periodicamente

## 📊 Resumo de Commits
- `4ab4a71` — security: proteção de autenticação para /admin e /api/health
- `e24660e` — security: verificação de role admin em /admin
- `[novo]` — security: headers, middleware, validação e documentação
