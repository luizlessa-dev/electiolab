-- Revisão de candidatos oficiais x pesquisas: Acre e Alagoas (Senado e Governo)
--
-- Senado Acre 2026: Jessica Sales (MDB) não é candidata ao cargo — desativar.
-- Governo Acre 2026: Jessica Sales, Jorge Viana, Mara Rocha e Marcio Bittar não
--   são candidatos ao cargo (todos concorrem ao Senado, não ao Governo) — desativar.
--
-- Senado Alagoas 2026: Paulo Dantas e Rodrigo Cunha não são candidatos ao cargo — desativar.
-- Governo Alagoas 2026: Rodrigo Cunha não é candidato ao cargo — desativar.
--
-- NOTA: duplicidade "Renan" (id 1337531a, tse_id preenchido) vs "Renan Calheiros"
-- (id 0e497ee7, sem tse_id) em Senador Alagoas 2026 NÃO foi mesclada nesta migration —
-- ambas as linhas têm dados financeiros/legislativos distintos e não sobrepostos
-- (ex.: prior_election_results só em 0e497ee7, candidate_revenue em ambas com valores
-- diferentes). Requer decisão manual antes de fundir para não duplicar/perder dados.

update candidates
set is_active = false
where id = '1b906751-d1c4-44da-95be-3eead03b9339' -- Jessica Sales, Senador Acre 2026
  and election_id = '3e9a804c-bdd2-4e1e-938b-69d1ab5774d3';

update candidates
set is_active = false
where id in (
  '31e56ef9-6f3a-4e54-bb9b-c1fa7088b3c9', -- Jessica Sales, Governador Acre 2026
  '3876b770-278b-49af-81e7-dc094e62b730', -- Jorge Viana, Governador Acre 2026
  'a748ec60-36fb-477f-be49-bf935a145beb', -- Mara Rocha, Governador Acre 2026
  '87932b01-3382-4de9-8c43-c125815f162c'  -- Marcio Bittar, Governador Acre 2026
)
and election_id = '573fdb59-eae3-40c7-bec9-70ce961332fc';

update candidates
set is_active = false
where id in (
  '8b5f836d-9985-4852-9788-9a66757896ab', -- Paulo Dantas, Senador Alagoas 2026
  '8505c7d8-ec8c-4892-81c0-84862f981d18'  -- Rodrigo Cunha, Senador Alagoas 2026
)
and election_id = 'f6896cba-46a0-4731-b3dc-c3e4282725ee';

update candidates
set is_active = false
where id = 'f9eae664-8f3d-4ed8-848f-a124eadce132' -- Rodrigo Cunha, Governador Alagoas 2026
  and election_id = 'ed76cff3-424e-4edb-8e09-4c6ab218f5e6';
