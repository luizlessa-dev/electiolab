-- Frente 2: Quotas Personalizadas - Override manual por admin
-- Permite team admins override limites padrão por customer

-- 1. Tabela de quotas customizadas
CREATE TABLE custom_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  override_limit INTEGER NOT NULL,
  override_reason TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(api_key_id)
);

CREATE INDEX idx_custom_quotas_user_id ON custom_quotas(user_id);
CREATE INDEX idx_custom_quotas_api_key_id ON custom_quotas(api_key_id);
CREATE INDEX idx_custom_quotas_changed_at ON custom_quotas(changed_at DESC);

-- 2. Tabela de auditoria: histórico de mudanças de quota
CREATE TABLE quota_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  old_limit INTEGER,
  new_limit INTEGER NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quota_change_logs_user_id ON quota_change_logs(user_id);
CREATE INDEX idx_quota_change_logs_changed_at ON quota_change_logs(changed_at DESC);

-- 3. RLS
ALTER TABLE custom_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_quotas_service_role ON custom_quotas
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY quota_change_logs_service_role ON quota_change_logs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. Função para buscar limit (tier padrão ou custom)
CREATE OR REPLACE FUNCTION get_api_rate_limit(
  p_api_key_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_custom_limit INTEGER;
  v_tier TEXT;
  v_default_limit INTEGER;
BEGIN
  -- Tentar buscar custom limit
  SELECT override_limit INTO v_custom_limit
  FROM custom_quotas
  WHERE api_key_id = p_api_key_id;

  IF v_custom_limit IS NOT NULL THEN
    RETURN v_custom_limit;
  END IF;

  -- Buscar tier padrão
  SELECT tier, rate_limit INTO v_tier, v_default_limit
  FROM api_keys
  WHERE id = p_api_key_id;

  RETURN v_default_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Função para upsert custom quota
CREATE OR REPLACE FUNCTION set_custom_quota(
  p_api_key_id UUID,
  p_user_id UUID,
  p_new_limit INTEGER,
  p_reason TEXT,
  p_changed_by UUID
)
RETURNS TABLE (
  success BOOLEAN,
  old_limit INTEGER,
  new_limit INTEGER,
  message TEXT
) AS $$
DECLARE
  v_old_limit INTEGER;
  v_old_custom INTEGER;
BEGIN
  -- Validar limite (0 a 999999)
  IF p_new_limit < 0 OR p_new_limit > 999999 THEN
    RETURN QUERY SELECT false, NULL::INTEGER, NULL::INTEGER, 'Limite inválido (0-999999)';
    RETURN;
  END IF;

  -- Buscar limite anterior (custom ou tier)
  SELECT get_api_rate_limit(p_api_key_id) INTO v_old_limit;
  SELECT override_limit INTO v_old_custom FROM custom_quotas WHERE api_key_id = p_api_key_id;

  -- Upsert custom_quotas
  INSERT INTO custom_quotas (api_key_id, user_id, override_limit, override_reason, changed_by)
  VALUES (p_api_key_id, p_user_id, p_new_limit, p_reason, p_changed_by)
  ON CONFLICT (api_key_id) DO UPDATE SET
    override_limit = p_new_limit,
    override_reason = p_reason,
    changed_by = p_changed_by,
    changed_at = NOW();

  -- Log em quota_change_logs
  INSERT INTO quota_change_logs (api_key_id, user_id, old_limit, new_limit, changed_by, reason)
  VALUES (p_api_key_id, p_user_id, v_old_limit, p_new_limit, p_changed_by, p_reason);

  RETURN QUERY SELECT true, v_old_limit, p_new_limit, 'Quota customizada com sucesso';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
