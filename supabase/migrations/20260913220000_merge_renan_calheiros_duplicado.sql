-- Deduplicação: "Renan" (id 1337531a) vs "Renan Calheiros" (id 0e497ee7)
-- Ambos em Senador Alagoas 2026, mesmo CPF (11078685487) = mesma pessoa.
--
-- Investigação campo a campo (2026-09-13):
-- - "Renan" (1337531a) tem tse_id (20002553727), veio do import oficial TSE 2026,
--   com receitas/fefc/social_media 2026 corretos (14 receitas, R$3,815M) e é o
--   registro que deve virar canônico.
-- - "Renan Calheiros" (0e497ee7) não tem tse_id (registro legado, criado antes
--   do import TSE). Tinha poll_results (4), legislative_votes (8, votos reais
--   de Plenário do Senado sobre tributário/indígenas/crime organizado) e
--   weighted_averages (1) — todos genuinamente do próprio Renan Calheiros,
--   ligados à election_id correta (Senador Alagoas 2026).
--
-- ACHADO ADICIONAL: quase todo o resto anexado a "Renan Calheiros" (assets,
-- expense_contracted/paid, fefc, revenue, social_media, prior_election_results
-- — ~366 linhas) tem cpf = 71014772168, que NÃO é o CPF de Renan Calheiros
-- (11078685487) — é o CPF de "Renan Filho" (José Renan Vasconcelos Calheiros
-- Filho, filho de Renan Calheiros, candidato a Governador Alagoas 2026, id
-- 4070c1cc-fd92-482f-96b1-7f4887fc59d6). Prior_election_results confirma: ele
-- foi eleito governador em 2018 e senador em 2022, e concorre a governador de
-- novo em 2026 — dados legítimos dele, só que anexados ao candidate_id errado
-- (provavelmente por um matching antigo por nome "Renan" em vez de CPF/tse_id).
--
-- Parte desses dados (fefc 2026, receita 2026 R$100mil, social_media 2026) já
-- existiam duplicados — e mais atualizados/completos — na própria linha de
-- Renan Filho (4070c1cc). Parte (assets, expense_contracted/paid,
-- prior_election_results, fefc/receita 2018-2022) NUNCA foi migrada para lá.
--
-- Esta migration resolve as duas coisas: funde o duplicado de Renan Calheiros
-- no canônico, e reencaminha os dados de Renan Filho para o candidate_id dele.

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 1: mover dados genuinamente do próprio Renan Calheiros pro canônico
-- ────────────────────────────────────────────────────────────────────────────

update poll_results
set candidate_id = '1337531a-4021-4d17-9a70-3c9b17f978af'
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6';

update legislative_votes
set candidate_id = '1337531a-4021-4d17-9a70-3c9b17f978af'
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6';

update weighted_averages
set candidate_id = '1337531a-4021-4d17-9a70-3c9b17f978af'
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6';

-- bio do canônico estava vazia; a linha antiga tinha bio de qualidade
update candidates
set bio = 'José Renan Vasconcelos Calheiros GOMM é um advogado, escritor e político brasileiro. Filiado ao Movimento Democrático Brasileiro (MDB), é senador por Alagoas e ex-presidente do Senado Federal e do Congresso Nacional.'
where id = '1337531a-4021-4d17-9a70-3c9b17f978af' and bio is null;

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 2: reencaminhar dados de Renan Filho (cpf 71014772168) pro id dele
-- ────────────────────────────────────────────────────────────────────────────

-- Sem conflito de índice único: nenhuma dessas linhas existe hoje em 4070c1cc
update candidate_assets
set candidate_id = '4070c1cc-fd92-482f-96b1-7f4887fc59d6'
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6';

update candidate_expense_contracted
set candidate_id = '4070c1cc-fd92-482f-96b1-7f4887fc59d6'
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6';

update candidate_expense_paid
set candidate_id = '4070c1cc-fd92-482f-96b1-7f4887fc59d6'
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6';

update prior_election_results
set candidate_id = '4070c1cc-fd92-482f-96b1-7f4887fc59d6'
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6';

-- fefc 2018/2022: Renan Filho ainda não tinha esses anos, mover sem conflito
update candidate_fefc
set candidate_id = '4070c1cc-fd92-482f-96b1-7f4887fc59d6'
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6'
  and election_year in (2018, 2022);

-- receita 2022: Renan Filho ainda não tinha receita desse ano, mover sem conflito
update candidate_revenue
set candidate_id = '4070c1cc-fd92-482f-96b1-7f4887fc59d6'
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6'
  and election_year = 2022;

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 3: remover duplicatas obsoletas (Renan Filho já tem versão mais nova)
-- ────────────────────────────────────────────────────────────────────────────

-- social_media 2026: as 7 URLs são idênticas às já existentes em 4070c1cc
delete from candidate_social_media
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6';

-- fefc 2026: valor (R$3M, coletado 08-31) é superado pelo já existente em
-- 4070c1cc (R$9,9M, coletado 09-12) — manter só o mais recente
delete from candidate_fefc
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6'
  and election_year = 2026;

-- receita 2026: única linha remanescente (sq_receita 47027978, R$100mil,
-- 2026-08-17, doador o próprio Renan Filho) é a mesma autodoação já registrada
-- em 4070c1cc sob sq_receita 47144432 (mesmo valor/data/doador) — remover para
-- não contar a doação em dobro
delete from candidate_revenue
where candidate_id = '0e497ee7-aaf0-4448-8783-531923e9c9f6';

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 4: desativar o duplicado (soft-delete, mantém a linha por histórico)
-- ────────────────────────────────────────────────────────────────────────────

update candidates
set is_active = false
where id = '0e497ee7-aaf0-4448-8783-531923e9c9f6';
