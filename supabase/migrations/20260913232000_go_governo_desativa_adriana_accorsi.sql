-- Governo GO 2026: usuário confirmou que não existe candidata "Adriana
-- Ancestral" — a única "Adriana" na base é Adriana Accorsi (PT), que não é
-- candidata ao cargo. Desativar.
update candidates
set is_active = false
where id = 'ba51db13-a86e-42ef-811b-b24e8d246999' -- Adriana Accorsi, Governador GO 2026
  and election_id = 'cb3067e3-7f98-47e3-99b3-aa13c30a768a';
