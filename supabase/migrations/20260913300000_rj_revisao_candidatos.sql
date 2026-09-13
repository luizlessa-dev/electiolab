-- Revisão de candidatos oficiais x pesquisas: Rio de Janeiro (Senado e Governo)
--
-- Anthony Garotinho: verificado antes de excluir — TRE-RJ indeferiu por
-- unanimidade o registro de candidatura ao Governo do RJ em 11/09/2026, por
-- inelegibilidade (suspensão de direitos políticos por 8 anos, condenação por
-- improbidade administrativa - desvio de verbas da saúde). Recurso ao TSE
-- anunciado mas ainda não julgado. Fonte: TRE-RJ (tre-rj.jus.br/comunicacao/
-- noticias/2026/Setembro/tre-rj-indefere-registro-de-candidatura-de-anthony-
-- garotinho-ao-governo-do-estado).

-- Governo RJ 2026: Anthony Garotinho, General Pazuello, Glauber Braga e
-- Wilson Witzel não são candidatos ao cargo — desativar.
update candidates
set is_active = false
where id in (
  '964236ad-e166-4beb-9c08-2e1e26ee050f', -- Anthony Garotinho, Governador RJ 2026
  'ed44c0b3-1124-4eac-960d-646458f21783', -- General Pazuello, Governador RJ 2026
  '239af15a-adf4-4a49-9dc2-721ad0c9f7f0', -- Glauber Braga, Governador RJ 2026
  '6359cf46-a99f-43d1-bdb4-fdc86dacfb12'  -- Wilson Witzel, Governador RJ 2026
)
and election_id = '4d5eaa69-74ec-4eda-8a43-d64c68af0412';

-- Senado RJ 2026: Cláudio Castro, Comandante Ribeiro Afonso e Marcio Canella
-- não são candidatos ao cargo — desativar.
update candidates
set is_active = false
where id in (
  'b0e9f0e9-7419-480e-88bf-334f7d71de2d', -- Claudio Castro, Senador RJ 2026
  '069bda44-6dd0-4d76-922f-e86a566dd0eb', -- Comandante Ribeiro Afonso, Senador RJ 2026
  'b449008e-b6c0-46c8-ba7b-000f9f97b731'  -- Marcio Canella, Senador RJ 2026
)
and election_id = '09f99790-d38d-4daa-aaf8-f4ad4b3f62cc';
