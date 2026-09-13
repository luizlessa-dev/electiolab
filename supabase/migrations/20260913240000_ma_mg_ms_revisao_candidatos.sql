-- Revisão de candidatos oficiais x pesquisas: Maranhão, Minas Gerais e
-- Mato Grosso do Sul (Senado e Governo)

-- Governo MA 2026: Carlos Brandão não é candidato ao cargo — desativar.
-- Achado extra: "Orleans Brandao" (id 4fcc42b9, MDB) tem o MESMO CPF de Carlos
-- Brandão (10411640330) — é a mesma pessoa duplicada sob outro nome/partido
-- na mesma corrida. Desativar também para não deixá-lo aparecendo pela
-- entrada duplicada.
update candidates
set is_active = false
where id in (
  '58d505ac-5f96-43c0-90d5-70af3c719ca6', -- Carlos Brandao, Governador MA 2026
  '4fcc42b9-5539-49fc-b796-11208c03540f'  -- Orleans Brandao (duplicata, mesmo CPF), Governador MA 2026
)
and election_id = 'a286718c-92e6-4838-880e-8edfeaf94351';

-- Senado MA 2026: Carlos Brandão e Roberto Rocha não são candidatos ao
-- cargo — desativar. (mantém ativos os registros deles em Governador MA 2026
-- quando aplicável — Roberto Rocha segue candidato a governador, com tse_id
-- válido; só o registro dele no Senado, sem tse_id, é desativado)
update candidates
set is_active = false
where id in (
  '6f4dc812-589f-4d57-af4a-ba9c687d0fbd', -- Carlos Brandao, Senador MA 2026
  '89262a57-0caa-4b00-9c91-f197b36f9b68'  -- Roberto Rocha, Senador MA 2026
)
and election_id = '25ef89d0-447e-49e1-8969-71a51035b30b';

-- Governo MG 2026: Carlos Viana não é candidato ao cargo — desativar.
-- (mantém ativo o registro dele em Senador MG 2026, candidatura correta)
update candidates
set is_active = false
where id = 'fc7e93d3-292e-4516-9165-4a1d8b306c4c' -- Carlos Viana, Governador MG 2026
  and election_id = 'ce047ca5-9962-4c94-95dd-f400a1994d03';

-- Senado MG 2026: Alexandre Silveira, Alexandre Kalil e Marcelo Heringer não
-- são candidatos ao cargo — desativar. (Alexandre Kalil segue ativo em
-- Governador MG 2026, candidatura correta)
update candidates
set is_active = false
where id in (
  '2753e273-cc88-4de6-a512-e420485078bd', -- Alexandre Silveira, Senador MG 2026
  'a1fd0fd9-b472-4b34-a134-6c51b3b0a26d', -- Alexandre Kalil, Senador MG 2026
  '0917ad98-3747-4ebc-9b0d-565526061e54'  -- Marcelo Heringer, Senador MG 2026
)
and election_id = '2918eac1-c9d7-4728-9b5b-d7d89c7e3306';

-- Governo MS 2026: Marcos Pollon não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = 'e3292a50-d034-44b4-82b3-b4d999819b6a' -- Marcos Pollon, Governador MS 2026
  and election_id = 'e6f1b08d-aa8e-45ed-b973-19dc8469c341';

-- Senado MS 2026: Tereza Cristina e Delcídio do Amaral não são candidatos ao
-- cargo — desativar. (Delcídio segue ativo em Governador MS 2026, candidatura
-- correta, não solicitada para exclusão)
update candidates
set is_active = false
where id in (
  '0f2b725f-8ead-46ea-a422-08d9e9dae247', -- Tereza Cristina, Senador MS 2026
  'e2abec7c-5d3b-4eee-8fd1-411e8636023a'  -- Delcidio do Amaral, Senador MS 2026
)
and election_id = '35f3ad48-c849-41b1-9930-7d7100ff30b7';
