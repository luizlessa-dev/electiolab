# Stripe Setup — ElectioLab

Guia passo-a-passo para configurar pagamentos com Stripe (test + prod) no ElectioLab.

## 1. Criar conta Stripe

1. https://dashboard.stripe.com/register — criar conta usando email da conta que controla o domínio electiolab.com
2. Ativar **Test mode** (toggle no canto superior direito do dashboard)
3. **Settings → Account → Public profile**
   - Nome: `ElectioLab`
   - Suporte: `contato@electiolab.com`
4. **Settings → Branding** — subir logo

## 2. Pegar as chaves de teste

1. Dashboard → **Developers → API keys**
2. Copiar:
   - `Publishable key` (começa com `pk_test_...`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` (começa com `sk_test_...`) → `STRIPE_SECRET_KEY`

Adicionar no `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 3. Criar Products + Prices

Já temos um script automatizado. Rode:

```bash
cd /Users/luizlessa/electiolab
STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/setup-stripe-products.ts
```

O script cria/atualiza:

| Plano | Preço | Frequência |
|-------|-------|------------|
| ElectioLab Pro | R$ 97 | mensal |
| ElectioLab Pro | R$ 970 | anual (2 meses grátis) |
| ElectioLab Business | R$ 497 | mensal |

No final, ele imprime as `Price IDs`. Copie para `.env.local`:

```bash
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
```

## 4. Configurar Webhook

### Local (com Stripe CLI)

```bash
# Instalar CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copie o `webhook signing secret` que aparece (começa com `whsec_...`):

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Produção (Vercel)

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://electiolab.com/api/webhooks/stripe`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copiar o `Signing secret`
5. Adicionar no Vercel **Settings → Environment Variables**:
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (production only)
   - `STRIPE_SECRET_KEY=sk_live_...` (production only — depois do Test mode)
   - `STRIPE_PRICE_PRO_MONTHLY` etc (production)

## 5. Testar checkout

### Cartões de teste

| Cenário | Número | CVV | Data |
|---------|--------|-----|------|
| Sucesso | 4242 4242 4242 4242 | qualquer | qualquer futura |
| Falha (declined) | 4000 0000 0000 0002 | qualquer | qualquer futura |
| 3D Secure | 4000 0027 6000 3184 | qualquer | qualquer futura |

### Fluxo manual

1. `npm run dev`
2. Abrir `http://localhost:3000/precos`
3. Logar (Google ou magic link)
4. Clicar **Assinar Pro**
5. Cartão de teste 4242
6. Após sucesso, verificar:
   - Redirect para `/dashboard?upgrade=success`
   - Email com a API key (caso `RESEND_API_KEY` configurado)
   - Tabela `api_keys` no Supabase com nova entrada

### Fluxo automatizado (Playwright)

```bash
npm run test:e2e            # local
npm run test:e2e:prod       # contra produção
npm run test:e2e:ui         # modo visual
```

Os testes E2E rodam:
- Renderização da página de preços
- Validação de redirects para login
- API endpoints públicos (200)
- Webhook sem signature (400)
- Sanity check de páginas principais

CI (GitHub Actions) roda diariamente em produção via `.github/workflows/e2e.yml`.

## 6. Variáveis de ambiente — checklist completo

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...           # ou sk_live_ em produção
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...

# Resend (envio do email com API key)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="ElectioLab <noreply@electiolab.com>"

# E2E (opcional)
E2E_TEST_EMAIL=test@example.com
E2E_BASE_URL=http://localhost:3000      # ou https://electiolab.com
```

## 7. Ir para produção

Depois de validar tudo em test mode:

1. Stripe → **Activate account** (preencher dados da empresa, conta bancária, KYC)
2. Toggle para **Live mode**
3. Repetir passos 2-4 com chaves `sk_live_` / `pk_live_`
4. Atualizar variáveis no Vercel **Settings → Environment Variables → Production**

## Suporte

- Documentação Stripe: https://docs.stripe.com
- Webhooks: https://docs.stripe.com/webhooks
- Test cards: https://docs.stripe.com/testing
