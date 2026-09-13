-- Revisão de candidatos oficiais x pesquisas: São Paulo (Senado e Governo)

-- Governo SP 2026: Kim Kataguiri não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = '25871cd9-6eff-4a5f-8508-05cf093ca7b9' -- Kim Kataguiri, Governador SP 2026
  and election_id = '8bda2fee-4c66-48f5-803a-703bec52a5cd';

-- Senado SP 2026: Paulinho da Força não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = 'c93bee95-083b-4897-a0e9-5db3f60e4450' -- Paulinho da Forca, Senador Sao Paulo 2026
  and election_id = '73c71b2e-1b0f-4fa9-a88f-946a4d72863d';
