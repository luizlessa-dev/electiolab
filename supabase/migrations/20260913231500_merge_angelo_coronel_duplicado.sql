-- Deduplicação: "Angelo Coronel" PSD (id 53c17560) vs "Angelo Coronel"
-- Republicanos (id cf1e94f7) em Senador Bahia 2026 — mesma pessoa (confirmado
-- pelo usuário: filiado ao Republicanos).
--
-- Investigação campo a campo (2026-09-13), mesmo padrão do caso Renan/Renan
-- Filho (Alagoas):
-- - "Angelo Coronel" Republicanos (cf1e94f7) tem tse_id (50002533124), veio do
--   import oficial TSE 2026, e é o registro que deve virar canônico.
-- - "Angelo Coronel" PSD (53c17560) é registro legado sem tse_id. A bio dele
--   já dizia "filiado ao Republicanos" (inconsistente com o próprio campo
--   party=PSD, confirma que o campo party estava desatualizado). Tinha
--   legislative_votes (8, votos reais de Plenário do Senado, mesmas matérias
--   do caso Renan) genuinamente do próprio Angelo Coronel senador.
--
-- ACHADO ADICIONAL: todo o resto anexado a essa linha (assets, revenue,
-- expense_contracted/paid, fefc, social_media, prior_election_results — 417
-- linhas de prior_election_results = um resultado por município da Bahia)
-- tem cpf = 81926154568, que NÃO é o CPF de Angelo Coronel (77865111568) —
-- é o CPF de "Angelo Coronel Filho" (Angelo Mario Coronel de Azevedo Martins
-- II, filho dele, candidato a Deputado Estadual Bahia 2026, id
-- 68258eac-901f-4d2a-8043-1586285e5933). prior_election_results confirma:
-- eleito deputado estadual BA em 2022 pelo PSD — dados legítimos do filho,
-- anexados ao candidate_id errado do pai (mesmo padrão de matching por nome
-- em vez de CPF/tse_id visto no caso Renan).
--
-- Parte desses dados (social_media 2026) já existia duplicada — e idêntica —
-- na própria linha do filho. O resto (assets, revenue, expense_contracted/
-- paid, fefc 2022, prior_election_results) nunca tinha sido migrado pra lá.

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 1: mover dados genuinamente do próprio Angelo Coronel pro canônico
-- ────────────────────────────────────────────────────────────────────────────

update legislative_votes
set candidate_id = 'cf1e94f7-d10a-4514-ad4c-b5376a484a63'
where candidate_id = '53c17560-cc46-4c17-ac79-2f3f7f643d70';

-- bio do canônico estava vazia; a linha antiga tinha bio de qualidade
update candidates
set bio = (select bio from candidates where id = '53c17560-cc46-4c17-ac79-2f3f7f643d70')
where id = 'cf1e94f7-d10a-4514-ad4c-b5376a484a63' and bio is null;

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 2: reencaminhar dados de Angelo Coronel Filho (cpf 81926154568) pro
-- id dele
-- ────────────────────────────────────────────────────────────────────────────

-- Sem conflito de índice único: nenhuma dessas linhas existe hoje em 68258eac
update candidate_assets
set candidate_id = '68258eac-901f-4d2a-8043-1586285e5933'
where candidate_id = '53c17560-cc46-4c17-ac79-2f3f7f643d70';

update candidate_expense_contracted
set candidate_id = '68258eac-901f-4d2a-8043-1586285e5933'
where candidate_id = '53c17560-cc46-4c17-ac79-2f3f7f643d70';

update candidate_expense_paid
set candidate_id = '68258eac-901f-4d2a-8043-1586285e5933'
where candidate_id = '53c17560-cc46-4c17-ac79-2f3f7f643d70';

update prior_election_results
set candidate_id = '68258eac-901f-4d2a-8043-1586285e5933'
where candidate_id = '53c17560-cc46-4c17-ac79-2f3f7f643d70';

-- fefc 2022 e receita 2022: filho ainda não tinha esse ano, mover sem conflito
-- (ele só tinha fefc/receita de 2026, anos diferentes, sem colisão de índice único)
update candidate_fefc
set candidate_id = '68258eac-901f-4d2a-8043-1586285e5933'
where candidate_id = '53c17560-cc46-4c17-ac79-2f3f7f643d70';

update candidate_revenue
set candidate_id = '68258eac-901f-4d2a-8043-1586285e5933'
where candidate_id = '53c17560-cc46-4c17-ac79-2f3f7f643d70';

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 3: remover duplicata obsoleta (filho já tem a mesma rede social)
-- ────────────────────────────────────────────────────────────────────────────

delete from candidate_social_media
where candidate_id = '53c17560-cc46-4c17-ac79-2f3f7f643d70';

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 4: desativar o duplicado (soft-delete, mantém a linha por histórico)
-- ────────────────────────────────────────────────────────────────────────────

update candidates
set is_active = false
where id = '53c17560-cc46-4c17-ac79-2f3f7f643d70';
