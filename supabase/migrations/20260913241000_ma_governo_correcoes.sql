-- Correções no Governo do Maranhão 2026 após confirmação do usuário:
--
-- 1) "Orleans Brandao" (id 4fcc42b9) NÃO é duplicata de Carlos Brandão —
--    usuário confirmou que é candidato legítimo e distinto, filiado ao MDB.
--    A coincidência de CPF com Carlos Brandão (10411640330) é um problema nos
--    dados de origem, não uma duplicata de pessoa — reativar.
update candidates
set is_active = true
where id = '4fcc42b9-5539-49fc-b796-11208c03540f' -- Orleans Brandao, Governador MA 2026
  and election_id = 'a286718c-92e6-4838-880e-8edfeaf94351';

-- 2) "Leandro Bonfim" não existe como candidato — usuário confirmou que o
--    nome refletido no site era na verdade "Lahesio Bonfim" (único Bonfim no
--    Governo MA), e que ele não é candidato ao cargo. Desativar.
update candidates
set is_active = false
where id = '945f8806-4370-48d4-98dc-5a0ebf49a513' -- Lahesio Bonfim, Governador MA 2026
  and election_id = 'a286718c-92e6-4838-880e-8edfeaf94351';
