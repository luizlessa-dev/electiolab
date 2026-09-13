-- Revisão de candidatos oficiais x pesquisas: Rio Grande do Norte
-- (Senado e Governo)

-- Governo RN 2026: Rogério Marinho e Styvenson Valentim não são candidatos
-- ao cargo — desativar. (mantêm-se ativos os registros deles em Senador RN
-- 2026, candidaturas duplas legítimas)
-- "Wagner Alves" pendente de confirmação (não bate com nenhum nome na base;
-- único "*Alves" no Governo RN é Walter Alves) — não desativado nesta migration.
update candidates
set is_active = false
where id in (
  '519e05b4-cbe8-454d-b0ef-2bf0b7faa17b', -- Rogerio Marinho, Governador RN 2026
  'd8833388-2d05-416f-8073-105e5b0201a1'  -- Styvenson Valentim, Governador RN 2026
)
and election_id = '18a8b0ce-11cf-4a1c-a43d-93b0559e8177';

-- Senado RN 2026: Fátima Bezerra e Rogério Marinho não são candidatos ao
-- cargo — desativar.
update candidates
set is_active = false
where id in (
  '24057086-232e-4bd8-b26d-1fdb51ef5bb0', -- Fatima Bezerra, Senador RN 2026
  'aae4d66a-b685-456e-bddb-35c24215192a'  -- Rogerio Marinho, Senador RN 2026
)
and election_id = 'c86e0aef-9f14-42aa-8fc3-a81f5d2b2947';
