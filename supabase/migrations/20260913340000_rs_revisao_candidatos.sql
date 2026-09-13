-- Revisão de candidatos oficiais x pesquisas: Rio Grande do Sul (Governo)
-- Senado RS 2026: sem alterações, confirmado pelo usuário.

-- Governo RS 2026: Covatti Filho e Edegar Pretto não são candidatos ao
-- cargo — desativar.
update candidates
set is_active = false
where id in (
  'c2a23f91-32c8-459a-9dd4-6413d59cd77f', -- Covatti Filho, Governador RS 2026
  'ed34f75c-86d8-4a95-89ef-b5ebe495facd'  -- Edegar Pretto, Governador RS 2026
)
and election_id = '0f54b587-5a85-44e8-abe2-3c61939f08de';
