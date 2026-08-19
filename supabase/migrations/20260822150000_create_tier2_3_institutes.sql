-- Migration: Criar institutos Tier 2-3 pra P1.2 Fase 2
-- Data: 2026-08-22
-- Institutos recomendados pelo agent de investigação

-- Adicionar coluna tier se não existir
ALTER TABLE public.institutes
ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1;

-- Inserir institutos Tier 2-3
INSERT INTO public.institutes (name, tier)
VALUES
  ('GERP', 2),
  ('MEIO/IDEIA', 2),
  ('VOX BRASIL', 2),
  ('REAL TIME BIG DATA', 2),
  ('INDEXA', 3),
  ('SMS Direct', 3),
  ('LAPOP', 3),
  ('VERITA', 3)
ON CONFLICT (name) DO NOTHING;
