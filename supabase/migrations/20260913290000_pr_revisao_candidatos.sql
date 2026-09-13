-- Revisão de candidatos oficiais x pesquisas: Paraná (Senado e Governo)
--
-- Conferido: "Adriano Funileiro" (id afc42146, PCO) e "Adriano Teixeira" são
-- a mesma pessoa — um único registro no banco, "Adriano Funileiro" é o nome
-- de urna/apelido e "Adriano Teixeira" é o full_name. Não há duplicidade,
-- nenhuma ação necessária.

-- Governo PR 2026: Rafael Greca e Ratinho Jr. não são candidatos ao
-- cargo — desativar.
update candidates
set is_active = false
where id in (
  '7844c380-58a4-4679-be08-f3216861c189', -- Rafael Greca, Governador Parana 2026
  '16f31ff1-3541-4f52-99bf-6cfff9f04179'  -- Ratinho Junior, Governador Parana 2026
)
and election_id = 'a6b2223a-f66d-4658-a33e-3db587fa66db';

-- Senado PR 2026: Alvaro Dias e Thiago Bagatin não são candidatos ao
-- cargo — desativar.
update candidates
set is_active = false
where id in (
  '5cd8cf03-47d7-4014-95e4-13f598d4ccc4', -- Alvaro Dias, Senador Parana 2026
  '392c95f3-4346-411b-8121-bea0ee841040'  -- Thiago Bagatin, Senador Parana 2026
)
and election_id = 'c9bf0e22-4975-4aab-8555-8aef9360c442';
