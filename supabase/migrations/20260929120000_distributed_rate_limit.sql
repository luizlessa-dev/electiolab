-- Tabela para armazenar contadores de rate limit distribuído
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para limpeza periódica de chaves expiradas
CREATE INDEX IF NOT EXISTS idx_rate_limit_expires_at
  ON public.rate_limit_counters(expires_at);

-- Função RPC para incrementar counter de rate limit atomicamente
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  key_param TEXT,
  max_requests INTEGER DEFAULT 100,
  ttl_seconds INTEGER DEFAULT 120
)
RETURNS TABLE(count INTEGER) AS $$
DECLARE
  current_count INTEGER;
  expire_time TIMESTAMP WITH TIME ZONE;
BEGIN
  expire_time := now() + (ttl_seconds || ' seconds')::INTERVAL;

  -- Upsert: incrementar ou inserir
  INSERT INTO public.rate_limit_counters (key, count, expires_at)
  VALUES (key_param, 1, expire_time)
  ON CONFLICT (key) DO UPDATE SET
    count = rate_limit_counters.count + 1,
    expires_at = GREATEST(rate_limit_counters.expires_at, expire_time)
  RETURNING rate_limit_counters.count INTO current_count;

  -- Limpar entradas expiradas a cada 100 chamadas (garbage collection leve)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_counters WHERE expires_at < now();
  END IF;

  RETURN QUERY SELECT current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permissions
REVOKE ALL ON FUNCTION public.increment_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, INTEGER, INTEGER)
  TO authenticated, anon, service_role;
