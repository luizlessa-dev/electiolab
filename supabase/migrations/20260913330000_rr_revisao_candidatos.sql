-- Revisão de candidatos oficiais x pesquisas: Roraima (Senado e Governo)

-- Governo RR 2026: Edilson Damião e Teresa Surita não são candidatos ao
-- cargo — desativar. (Teresa Surita segue ativa em Senador RR 2026,
-- candidatura correta)
update candidates
set is_active = false
where id in (
  '61f1b07d-4612-4cd4-be2a-2eaa10d2399f', -- Edilson Damiao, Governador RR 2026
  '2a118e74-bd6b-42ec-9aa7-84cc0e14ff5a'  -- Teresa Surita, Governador RR 2026
)
and election_id = 'b8ac195f-5666-44b7-9446-f42359ed1684';

-- Senado RR 2026: Antônio Denarium não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = '97131927-27a4-4037-9bfa-4ccf0acae55c' -- Antonio Denarium, Senador Roraima 2026
  and election_id = '7a43b648-39ec-4323-8372-a26f7ef247bf';
