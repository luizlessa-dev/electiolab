-- ============================================================================
-- BACKFILL: Margin of Error para polls existentes
-- ============================================================================
--
-- Calcula MoE usando fórmula padrão: 1.96 * sqrt(p*(1-p)/n)
-- Usando p=0.5 (worst case) para conservadorismo
-- MoE = 1.96 * sqrt(0.25 / sample_size)
--
-- Status: Safe to run - apenas UPDATE nos NULLs
-- ============================================================================

BEGIN;

-- 1. Calcular MoE teórico para polls sem MoE
UPDATE polls
SET margin_of_error = ROUND(1.96 * SQRT(0.25 / NULLIF(sample_size, 0))::numeric, 2)
WHERE margin_of_error IS NULL
  AND sample_size > 0;

-- 2. Log das mudanças
INSERT INTO data_source_audit (
  election_id,
  source_type,
  operation,
  record_count,
  description,
  created_at
)
SELECT
  NULL,
  'polls',
  'backfill_moe',
  COUNT(*),
  'Backfilled margin_of_error using formula: 1.96 * sqrt(0.25 / sample_size)',
  NOW()
FROM polls
WHERE margin_of_error IS NOT NULL;

-- 3. Validação: mostrar o que foi atualizado
SELECT
  COUNT(*) as backfilled_count,
  ROUND(AVG(margin_of_error), 2) as avg_moe,
  ROUND(MIN(margin_of_error), 2) as min_moe,
  ROUND(MAX(margin_of_error), 2) as max_moe
FROM polls
WHERE margin_of_error IS NOT NULL;

COMMIT;
