-- Padronizar nomes de eleições de Governador 2026 para formato "XX - 1º Turno"
-- Isso alinha com os nomes esperados pelo ingest-manual.ts e mantém consistência com
-- eleições de estados como SP, MG, RJ, BA, CE, PE, GO, RS que já seguem esse padrão.

UPDATE public.elections
SET name = 'Governador MS 2026 - 1º Turno'
WHERE state = 'MS' AND type = 'governador' AND year = 2026 AND round = 1
  AND name = 'Governador Mato Grosso do Sul 2026';

UPDATE public.elections
SET name = 'Governador PA 2026 - 1º Turno'
WHERE state = 'PA' AND type = 'governador' AND year = 2026 AND round = 1
  AND name = 'Governador Para 2026';

UPDATE public.elections
SET name = 'Governador RN 2026 - 1º Turno'
WHERE state = 'RN' AND type = 'governador' AND year = 2026 AND round = 1
  AND name = 'Governador Rio Grande do Norte 2026';

UPDATE public.elections
SET name = 'Governador RR 2026 - 1º Turno'
WHERE state = 'RR' AND type = 'governador' AND year = 2026 AND round = 1
  AND name = 'Governador Roraima 2026';
