-- Revisão de candidatos oficiais x pesquisas: Ceará, Distrito Federal,
-- Espírito Santo e Goiás (Senado e Governo)

-- Governo CE 2026: Pedro Brito, Camilo Santana, Eduardo Girão e Roberto
-- Claudio não são candidatos ao cargo — desativar.
update candidates
set is_active = false
where id in (
  'beb3a1c8-bec0-408d-b911-df81651a6b0a', -- Pedro Brito, Governador CE 2026
  '0b315177-d04d-4c73-91d6-bc00206c60ce', -- Camilo Santana, Governador CE 2026
  '46c222bc-4252-48d2-a82a-98fce178557b', -- Eduardo Girao, Governador CE 2026
  'e3ec81e0-eb3b-40d4-b5c0-c8054b3e0c0f'  -- Roberto Claudio, Governador CE 2026
)
and election_id = '8a5ddaed-9e6b-4626-95e7-e84522c4287d';

-- Senado CE 2026: Eunício Oliveira e Roberto Claudio não são candidatos ao
-- cargo — desativar.
update candidates
set is_active = false
where id in (
  'd321a031-f829-4751-b6cd-c5db3655ba50', -- Eunicio Oliveira, Senador Ceara 2026
  '965ca1b8-357f-480f-9369-e4607b52bca6'  -- Roberto Claudio, Senador Ceara 2026
)
and election_id = '7c9efdc4-a25f-4211-8bde-fad013e06237';

-- Senado DF 2026: Ibaneis Rocha não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = 'afda6b9e-5b2e-4504-8200-c9e861b56399' -- Ibaneis Rocha, Senador DF 2026
  and election_id = 'da157710-3f50-4c0f-904b-6963ecb880b4';

-- Governo ES 2026: Rafael Demuner e Magno Malta não são candidatos ao
-- cargo — desativar.
update candidates
set is_active = false
where id in (
  '61f5e48e-dc94-493e-9802-7d4e1931eb2d', -- Rafael Demuner, Governador ES 2026
  'b12a75fc-852a-4aa0-97a4-ae7a25498e97'  -- Magno Malta, Governador ES 2026
)
and election_id = 'ef207d99-2ec5-434e-aa6d-e960865f0bb9';

-- Senado ES 2026: Lorenzo Pazolini não é candidato ao cargo — desativar.
-- (mantém ativo o registro dele em Governador ES 2026, candidatura dupla legítima)
update candidates
set is_active = false
where id = '7ac0a8a3-4f7a-4d17-85b0-9c9b166547a3' -- Lorenzo Pazolini, Senador ES 2026
  and election_id = '9d4c492d-3f61-45f0-ab57-4626dc864f52';

-- Senado GO 2026: Alexandre Baldy não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = '6566ee1a-d8c6-4217-a294-f42df5323527' -- Alexandre Baldy, Senador Goias 2026
  and election_id = '37a3ccc4-8dfa-427a-bb05-4ddcb71e7dee';
