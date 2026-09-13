-- Revisão de candidatos oficiais x pesquisas: Paraíba (Senado e Governo)

-- Governo PB 2026: Veneziano Vital não é candidato ao cargo — desativar.
-- (mantém ativo o registro dele em Senador PB 2026, candidatura correta)
update candidates
set is_active = false
where id = '9b3c5681-2514-496f-91ef-ee7c8a2cbe72' -- Veneziano Vital, Governador Paraiba 2026
  and election_id = 'fd349384-7c24-4d63-b950-309228d37386';

-- Senado PB 2026: Ricardo Coutinho não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = '7c62efc7-f353-4618-a4f9-8edc1057c92a' -- Ricardo Coutinho, Senador Paraiba 2026
  and election_id = 'c3e60b94-4b54-4610-a6b0-6d5e87d66c1b';
