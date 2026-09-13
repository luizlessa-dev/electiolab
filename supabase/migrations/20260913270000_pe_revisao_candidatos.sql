-- Revisão de candidatos oficiais x pesquisas: Pernambuco (Senado e Governo)

-- Governo PE 2026: Eduardo Moura não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = '5e7c6e4c-af82-4182-8600-f90719279868' -- Eduardo Moura, Governador PE 2026
  and election_id = '0cffd39e-1922-49fc-819b-7d9c7829f127';

-- Senado PE 2026: Anderson Ferreira não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = '73cc46f8-d170-4f33-9f4d-cc9bfb074fe8' -- Anderson Ferreira, Senador Pernambuco 2026
  and election_id = 'f48a8ffe-7eaa-49f5-94eb-03da0b53e506';
