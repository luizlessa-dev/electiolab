-- Revisão de candidatos oficiais x pesquisas: Tocantins (Senado e Governo)

-- Governo TO 2026: Carlos Amastha e Siqueira Campos Jr. não são candidatos
-- ao cargo — desativar.
update candidates
set is_active = false
where id in (
  'a7cfafac-2660-4162-b1b9-ef3de743eb95', -- Carlos Amastha, Governador Tocantins 2026
  '4dd7bbea-e11b-4093-ab86-14d1630ee08b'  -- Siqueira Campos Jr, Governador Tocantins 2026
)
and election_id = '70d2bd8f-7fd5-4428-aad9-8ee67b25a7f3';

-- Senado TO 2026: Nilton Santos, Dorinha Rezende e Wanderlei Barbosa não são
-- candidatos ao cargo — desativar. (Dorinha segue ativa em Governador TO
-- 2026, candidatura correta)
update candidates
set is_active = false
where id in (
  'ceefce5b-8d9d-4464-a131-473d79d7fb93', -- Nilton Santos, Senador Tocantins 2026
  'fb3dc323-5ddc-487a-8401-74e8f0c3edc5', -- Dorinha Rezende, Senador Tocantins 2026
  '93a85c59-abfc-45a9-ab43-1c75c6d932e4'  -- Wanderlei Barbosa, Senador Tocantins 2026
)
and election_id = 'd50812b7-e0b8-4be3-8d57-7b5243eff00f';
