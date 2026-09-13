-- Revisão de candidatos oficiais x pesquisas: Piauí (Senado e Governo)

-- Governo PI 2026: corrige nome quebrado "Gustavo Pelo Piauí Ou Gustavo"
-- (full_name já correto: Gustavo Henrique Leite Feijó, AVANTE) para "Gustavo
-- Henrique".
update candidates
set name = 'Gustavo Henrique',
    slug = 'gustavo-henrique'
where id = 'c57e6361-98ea-4b4f-922b-886ddb368f98';

-- Governo PI 2026: deduplicação "Elizeu Aguiar" (66ae0a02, slug elizeu-aguiar)
-- vs "Elizeu Aguiar" (f389b664, slug elizeu-aguiar-2) — mesmo CPF
-- (32766076387), mesmo full_name, mesma eleição, inseridos no mesmo lote de
-- ingestão sob dois tse_id diferentes. Canônico: f389b664, que tem os dados
-- financeiros mais completos (12 bens, 96 despesas contratadas, 9 receitas,
-- FEFC 2022) contra praticamente nada em 66ae0a02 (0 bens, 1 despesa, 3
-- receitas, FEFC 2026). Move o que não é duplicata (receita, despesa
-- contratada, FEFC 2026 — anos/registros diferentes, sem colisão de índice
-- único) pro canônico, remove a rede social já duplicada, e assume o slug
-- principal "elizeu-aguiar".
update candidate_revenue
set candidate_id = 'f389b664-38f3-43e0-aee4-7f90ad953858'
where candidate_id = '66ae0a02-eb80-4e17-a8d5-4c7e7f7eea92';

update candidate_expense_contracted
set candidate_id = 'f389b664-38f3-43e0-aee4-7f90ad953858'
where candidate_id = '66ae0a02-eb80-4e17-a8d5-4c7e7f7eea92';

update candidate_fefc
set candidate_id = 'f389b664-38f3-43e0-aee4-7f90ad953858'
where candidate_id = '66ae0a02-eb80-4e17-a8d5-4c7e7f7eea92';

delete from candidate_social_media
where candidate_id = '66ae0a02-eb80-4e17-a8d5-4c7e7f7eea92';

update candidates
set slug = null
where id = '66ae0a02-eb80-4e17-a8d5-4c7e7f7eea92';

update candidates
set slug = 'elizeu-aguiar'
where id = 'f389b664-38f3-43e0-aee4-7f90ad953858';

update candidates
set is_active = false
where id = '66ae0a02-eb80-4e17-a8d5-4c7e7f7eea92';

-- Governo PI 2026: Margarete Coelho, Silvio Mendes e Tonny Kerley não são
-- candidatos ao cargo — desativar.
update candidates
set is_active = false
where id in (
  '9a9f5884-b557-4b78-8856-98117d743733', -- Margarete Coelho, Governador Piaui 2026
  '5bd24343-5a67-4c38-b531-417170fafd6e', -- Silvio Mendes, Governador Piaui 2026
  'e628c8fe-fb68-4cdd-b349-433a401c0f20'  -- Tonny Kerley, Governador Piaui 2026
)
and election_id = '86e1fa19-0d18-4dce-81af-cd6e708583bd';

-- Senado PI 2026: Wellington Dias não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = 'ebb8113f-66f4-4d1f-a1e2-6b98402a6784' -- Wellington Dias, Senador Piaui 2026
  and election_id = 'fb1bccd8-1e99-4242-99f4-bca87a4c7db1';
