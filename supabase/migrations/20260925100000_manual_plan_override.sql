-- Atribuição manual de plano (fora do Stripe), com proteção contra
-- sobrescrita pelo webhook do Stripe.
--
-- Contexto: só existia um caminho para tier/rate_limit em api_keys — o
-- webhook do Stripe (checkout.session.completed / customer.subscription.*).
-- Para conceder um plano manualmente (ex.: conta do fundador) sem passar
-- pelo Stripe, e sem correr o risco de um evento do Stripe (ex.: um
-- subscription.deleted órfão) desativar essa concessão depois, marcamos a
-- origem do plano em cada api_keys.

ALTER TABLE api_keys
  ADD COLUMN plan_source TEXT NOT NULL DEFAULT 'stripe'
  CONSTRAINT api_keys_plan_source_check CHECK (plan_source IN ('stripe', 'manual'));

COMMENT ON COLUMN api_keys.plan_source IS
  'stripe = tier sincronizado pelo webhook do Stripe (src/app/api/webhooks/stripe/route.ts). '
  'manual = atribuído via scripts/grant-manual-plan.ts (syncSubscription trigger=''manual''); '
  'o webhook do Stripe ignora (não sobrescreve) contas marcadas como manual.';
