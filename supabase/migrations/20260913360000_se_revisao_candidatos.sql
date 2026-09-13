-- Revisão de candidatos oficiais x pesquisas: Sergipe (Senado e Governo)

-- Governo SE 2026: Rogério Carvalho (PT) não é candidato ao cargo —
-- desativar. (mantém ativo o registro dele em Senador SE 2026, candidatura
-- correta)
update candidates
set is_active = false
where id = 'e6c560ee-0a6f-4b7d-b278-beb591ed7be4' -- Rogerio Carvalho, Governador Sergipe 2026
  and election_id = '09ef8dd4-a40f-4ae4-9b5a-f456113f0831';

-- Senado SE 2026: Belivaldo Chagas não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = '525e04bb-887e-42dc-8e47-2db70f94a056' -- Belivaldo Chagas, Senador Sergipe 2026
  and election_id = 'e39924d1-1293-48f7-9761-9a93ae6f6df0';
