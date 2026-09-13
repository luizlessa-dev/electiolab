-- Revisão de candidatos oficiais x pesquisas: Amazonas (Senado e Governo)
-- Senado AM 2026: Marcelo Ramos (PT) não é candidato ao cargo — desativar.
-- Governo AM 2026: Eduardo Braga, Tadeu de Souza e Wilson Lima não são candidatos
--   ao cargo (Eduardo Braga e Wilson Lima migraram para o Senado) — desativar.
-- Evandro de Oliveira (PSTU) já existe ativo em Senado AM 2026 — nenhuma ação necessária.

update candidates
set is_active = false
where id = 'f3103cc4-f0b3-47a1-a21a-c346cd09d55d' -- Marcelo Ramos, Senador Amazonas 2026
  and election_id = 'a149d6c7-a727-4dfe-b8a0-ae3c1511191e';

update candidates
set is_active = false
where id in (
  '203079bd-7f4e-4d97-942d-cb8884ebf438', -- Eduardo Braga, Governador Amazonas 2026
  '1179a8fb-bd67-4ec5-b487-cf67b3948256', -- Tadeu de Souza, Governador Amazonas 2026
  'fb887c44-7c7a-42f3-8acc-eccf5bc1bff1'  -- Wilson Lima, Governador Amazonas 2026
)
and election_id = '2c164a84-dd67-44eb-b47f-d0f5d5c09d65';
