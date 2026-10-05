-- Zera o tse_id de 2026 herdado por perfis de presidente 2022.
--
-- Ciro, Simone Tebet e Soraya Thronicke têm um perfil por corrida: presidente 2022 e
-- a candidatura de 2026 (governador CE, senadora SP, senadora MS). O perfil de 2022
-- ficou com o SQ_CANDIDATO de 2026 — resíduo do bug do mapa global de tse_id/cpf do
-- ingest-tse-candidaturas.ts (ver scripts/fix-tse-candidate-stamps.ts, que só repara
-- perfis do ano informado e por isso não pegou estes).
--
-- O carimbo certo continua no perfil de 2026. Este update só mexe nos 3 perfis de
-- 2022, e só se o tse_id ainda for o de 2026 (rodar de novo não faz nada).
--
-- Esperado: UPDATE 3.

update public.candidates c
set tse_id = null
from public.elections e
where e.id = c.election_id
  and e.year = 2022
  and (c.id, c.tse_id) in (
    ('362886b5-4cb5-404b-8e46-cc43ff4d8284'::uuid, '60002531351'),   -- Ciro (presidente 2022)
    ('6b11c0d0-0c19-4469-b09c-bf907b00c771'::uuid, '250002551502'),  -- Simone Tebet (presidente 2022)
    ('fa13a038-4643-4821-a8b6-e83adc7e15f6'::uuid, '120002547434')   -- Soraya (presidente 2022)
  );
