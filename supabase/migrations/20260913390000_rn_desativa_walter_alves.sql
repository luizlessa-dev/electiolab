-- "Wagner Alves" (pedido original de exclusão do Governo RN) não existe
-- como candidato — usuário confirmou. Único "*Alves" na base do RN 2026 é
-- Walter Alves, com dois registros do mesmo CPF (03200380411): um em
-- Governador RN 2026 e outro em Deputado Estadual RN 2026. Usuário
-- confirmou que nenhum dos dois procede — desativar ambos.
update candidates
set is_active = false
where id in (
  'af3f1489-d807-4e3d-8c1e-f2eef5e90eb8', -- Walter Alves, Governador RN 2026
  '9755e99b-0414-48bd-abbe-aa85ae52f528'  -- Walter Alves, Deputado Estadual RN 2026
);
