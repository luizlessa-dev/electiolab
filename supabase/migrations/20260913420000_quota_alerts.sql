-- Frente 1: Alertas quando cliente atinge 80% do limite
-- Sistema de notificação diária para clientes próximos do limite

-- 1. Adicionar coluna last_warning_sent_at em api_keys
ALTER TABLE api_keys ADD COLUMN last_warning_sent_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX idx_api_keys_last_warning_sent_at ON api_keys(last_warning_sent_at);

-- 2. Tabela de auditoria: registro de alertas enviados
CREATE TABLE quota_alert_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  usage_percent NUMERIC(5, 2) NOT NULL, -- 85.5 = 85,5%
  tier TEXT NOT NULL,
  rate_limit INTEGER NOT NULL,
  requests_used INTEGER NOT NULL,
  reset_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('sent', 'failed', 'skipped')) DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quota_alert_runs_user_id ON quota_alert_runs(user_id);
CREATE INDEX idx_quota_alert_runs_sent_at ON quota_alert_runs(sent_at DESC);
CREATE INDEX idx_quota_alert_runs_status ON quota_alert_runs(status);

-- 3. RLS
ALTER TABLE quota_alert_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY quota_alert_runs_service_role ON quota_alert_runs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. RPC: check_api_quota_alerts()
-- Retorna keys com usage >= 80% que não receberam alerta nas últimas 24h
CREATE OR REPLACE FUNCTION check_api_quota_alerts()
RETURNS TABLE (
  api_key_id UUID,
  user_id UUID,
  email TEXT,
  usage_percent NUMERIC,
  tier TEXT,
  rate_limit INTEGER,
  requests_used INTEGER,
  period_resets_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ak.id,
    ak.user_id,
    u.email,
    ROUND((ak.requests_used::NUMERIC / ak.rate_limit::NUMERIC) * 100, 2),
    ak.tier,
    ak.rate_limit,
    ak.requests_used,
    ak.period_start + INTERVAL '1 month'
  FROM api_keys ak
  JOIN auth.users u ON u.id = ak.user_id
  WHERE
    ak.is_active = true
    AND ak.tier IN ('pro', 'business', 'enterprise')
    AND (ak.requests_used::NUMERIC / ak.rate_limit::NUMERIC) >= 0.80
    AND (ak.last_warning_sent_at IS NULL OR ak.last_warning_sent_at < NOW() - INTERVAL '24 hours')
  ORDER BY ak.requests_used DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Função para registrar alerta enviado
CREATE OR REPLACE FUNCTION mark_alert_sent(
  p_api_key_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE api_keys
  SET last_warning_sent_at = NOW()
  WHERE id = p_api_key_id OR user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
