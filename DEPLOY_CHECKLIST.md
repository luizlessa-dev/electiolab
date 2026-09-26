# 🚀 Deploy Checklist — 4 Frentes + Alertas Automáticos

**Status:** ✅ Código pronto, GitHub Actions configurado, Vercel aguardando trigger

---

## 📋 **PASSO 1: Monitorar Deploy Vercel**

1. **Antes do merge**: aplique manualmente as migrations novas de `supabase/migrations/` no SQL Editor do painel do Supabase (Luiz). Não há integração automática — nem Vercel, nem GitHub Actions aplicam migrations neste projeto. O arquivo `.sql` no repo é o registro do que foi aplicado, não o mecanismo que aplica.
2. Acesse: https://vercel.com/dashboard → electiolab
3. Aguarde build completar (2-3 minutos)
4. Verifique:
   - ✅ Build logs: sucesso
   - ✅ Migrations Supabase: já aplicadas manualmente no passo 1 (confirme em Table Editor / `supabase_migrations.schema_migrations`)
   - ✅ URL em produção

**Status esperado:** Deployments verde com "Production"

---

## 🔐 **PASSO 2: Configurar Environment Variables**

### Vercel → Settings → Environment Variables

Adicionar 2 novas (outras já existem):

```
CRON_JOB_TOKEN = sk_prod_<gere-uma-string-segura>
   (copie este valor, usará no Passo 3)

ADMIN_EMAIL = luiz@gastronomizae.com
```

**Depois de salvar:** Redeploy na Vercel (botão "Redeploy" ou git push vazio)

---

## ⚙️ **PASSO 3: Configurar GitHub Secret para Cron**

1. GitHub → seu repo → Settings → Secrets and variables → Actions
2. Clique "New repository secret"
3. Name: `CRON_JOB_TOKEN`
   Value: `sk_prod_<mesmo-valor-do-passo-2>`
4. Clique "Add secret"

**Pronto!** GitHub Actions agora dispara `/api/admin/send-quota-alerts` diariamente 6:00 UTC

---

## ✅ **PASSO 4: Testar Endpoints**

Após Vercel confirm sucesso:

```bash
# 1. API anônima (rate limit 60/dia)
curl https://electiolab.com/api/v1/elections | jq '.data[0]'

# 2. OpenAPI documentação (Frente 4)
curl https://electiolab.com/openapi.yaml | head -30

# 3. Admin custom quotas (deve retornar 401 sem Bearer)
curl -X GET https://electiolab.com/api/admin/custom-quotas \
  -H "Authorization: Bearer fake" -w "\nStatus: %{http_code}\n"

# 4. Teste manual de alertas (opcional, força execução)
curl -X GET \
  "https://electiolab.com/api/admin/send-quota-alerts?token=sk_prod_<seu-token>" \
  -w "\nStatus: %{http_code}\n"
```

---

## 🎯 **4 Frentes Implementadas**

### **Frente 1: Alertas 80%+** ✅
- Email diário quando cliente atinge 80% da quota
- Trigger: GitHub Actions, 6:00 UTC
- Status: Automático após configurar secret

### **Frente 2: Quotas Personalizadas** ✅
- Admin pode override limites padrão
- UI: `/dashboard/admin/custom-quotas`
- Email ao customer quando quota muda
- Status: Pronto para usar

### **Frente 3: Billing Integration** ✅
- Sincroniza tier/limite em tempo real (webhook Stripe)
- Admin notificado de payment_failed
- Histórico: `/dashboard/admin/api-usage`
- Status: Automático com webhook Stripe

### **Frente 4: OpenAPI Docs** ✅
- Rate limit headers documentados com exemplos
- Schemas: RateLimitError, RateLimitErrorAnonymous
- Todos 6 endpoints com 429 responses
- Status: Ao vivo em `/openapi.yaml`

---

## 📊 **Admin Dashboards**

Após deploy, acessíveis em `/dashboard/admin/`:

1. **api-usage** — KPIs, API keys, histórico de tiers
   - Nova: Quota alerts sent today + last run
   - Nova: Subscription changes history

2. **custom-quotas** — Gerenciar overrides
   - Buscar API key por user_id/tier
   - Atualizar limite + motivo
   - Enviar email ao cliente

---

## 🔔 **Monitoramento Contínuo**

- **Alertas:** Check `/dashboard/admin/api-usage` → "Alertas de Quota"
- **Billing:** Check "Histórico de Mudanças de Tier"
- **Payment Failures:** Check `quota_alert_runs` table (status = 'failed')
- **Logs:** Vercel → Logs → filter `[quota-alerts]`, `[stripe webhook]`, `[custom-quotas]`

---

## 🚨 **Troubleshooting**

| Problema | Solução |
|----------|---------|
| Cron job não dispara | Verificar GitHub Actions → quota-alerts-daily.yml → "Run" |
| Alertas não enviados | Verificar CRON_JOB_TOKEN correto em GitHub Secrets |
| Emails não chegam | Verificar RESEND_API_KEY em Vercel + email "noreply@electiolab.com" em allowlist |
| Custom quotas retorna 401 | User precisa ter `app_metadata.is_admin = true` no auth.users (setar via service_role, nunca via `user_metadata`) |
| Webhook Stripe não sincroniza | Verificar STRIPE_WEBHOOK_SECRET + endpoint `/api/webhooks/stripe` ativo |

---

## 📝 **Próximas Ações (Pós-Deploy)**

1. ✅ Monitorar Vercel deploy
2. ✅ Configurar env vars Vercel
3. ✅ Configurar GitHub secret
4. ✅ Testar endpoints
5. 📅 Teste cron job: trigger manual em GitHub Actions
6. 📧 Verificar first alert amanhã 6:00 UTC
7. 💬 Comunicar aos clientes sobre novos alertas

---

**Status Atual:** Code pushed + GitHub Actions ready  
**Próxima etapa:** Aguardar Vercel deploy green ✅
