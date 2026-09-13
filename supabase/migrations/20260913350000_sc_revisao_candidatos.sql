-- Revisão de candidatos oficiais x pesquisas: Santa Catarina (Governo)
-- Senado SC 2026: sem alterações, confirmado pelo usuário.

-- Governo SC 2026: Decio Lima e Marcos Vieira não são candidatos ao
-- cargo — desativar.
update candidates
set is_active = false
where id in (
  'ab5ed7bc-f591-4310-8d25-e038da63defc', -- Decio Lima, Governador Santa Catarina 2026
  'fc654721-e411-478c-90cd-8dff6076755e'  -- Marcos Vieira, Governador Santa Catarina 2026
)
and election_id = 'd443a43c-19b5-4ee2-87ad-8e7ccc092140';
