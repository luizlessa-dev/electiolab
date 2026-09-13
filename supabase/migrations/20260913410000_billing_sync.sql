-- Frente 3: Billing Integration - Stripe Sync
-- Adiciona colunas de rastreamento de subscription e audit tables

-- 1. Adicionar coluna stripe_subscription_id em api_keys
ALTER TABLE api_keys ADD COLUMN stripe_subscription_id TEXT UNIQUE;
CREATE INDEX idx_api_keys_stripe_subscription_id ON api_keys(stripe_subscription_id);

-- 2. Adicionar billing_cycle_end para próximo reset de período
ALTER TABLE api_keys ADD COLUMN billing_cycle_end TIMESTAMP WITH TIME ZONE;

-- 3. Tabela de auditoria: mudanças de tier/limite
CREATE TABLE subscription_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  old_tier TEXT,
  new_tier TEXT NOT NULL,
  old_rate_limit INTEGER,
  new_rate_limit INTEGER NOT NULL,
  trigger TEXT CHECK (trigger IN ('checkout', 'subscription.updated', 'subscription.deleted', 'manual')),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_subscription_changes_user_id ON subscription_changes(user_id);
CREATE INDEX idx_subscription_changes_changed_at ON subscription_changes(changed_at DESC);

-- 4. Tabela de auditoria: falhas de pagamento
CREATE TABLE payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_customer_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invoice_id TEXT,
  invoice_amount_cents INTEGER,
  invoice_currency TEXT,
  failure_reason TEXT,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  admin_notified_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_failures_user_id ON payment_failures(user_id);
CREATE INDEX idx_payment_failures_failed_at ON payment_failures(failed_at DESC);
CREATE INDEX idx_payment_failures_stripe_customer_id ON payment_failures(stripe_customer_id);

-- 5. RLS policies
ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_changes_service_role ON subscription_changes
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY payment_failures_service_role ON payment_failures
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Permite leitura por admin (usuários com role 'admin' ou no auth.users com is_admin)
-- Isso é simplificado; ajuste conforme sua política real
