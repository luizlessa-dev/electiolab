-- Revisão de candidatos oficiais x pesquisas: Mato Grosso e Pará
-- (Senado e Governo)

-- Governo MT 2026: Jose Medeiros não é candidato ao cargo — desativar.
-- (mantém ativo o registro dele em Senador MT 2026, candidatura correta,
-- Senado MT sem alterações solicitadas)
update candidates
set is_active = false
where id = 'd1f3cfdb-cafa-4e7f-950e-e8acc762f0d8' -- Jose Medeiros, Governador MT 2026
  and election_id = '83003ec6-3319-473d-869a-3ec765b6b377';

-- Governo MT 2026: deduplicação "Sargento Laudicério" (e8cb87cb) vs
-- "Sargento Laudicério (lau)" (f26cfe3f) — mesmo CPF (69727546153), mesmo
-- full_name, mesma eleição. Canônico: e8cb87cb, que já tem poll_results,
-- weighted_averages e candidate_revenue; f26cfe3f não tem nenhum desses.
-- Mover rede social exclusiva (facebook/instagram/site) pro canônico; remover
-- tiktok/twitter duplicados (mesma URL, só case diferente) já presentes lá.
update candidate_social_media
set candidate_id = 'e8cb87cb-f7c2-476e-b891-dbef0b113bff'
where candidate_id = 'f26cfe3f-82ca-42ca-8b2d-da43e62eace1'
  and platform in ('facebook', 'instagram', 'outro');

delete from candidate_social_media
where candidate_id = 'f26cfe3f-82ca-42ca-8b2d-da43e62eace1';

update candidates
set is_active = false
where id = 'f26cfe3f-82ca-42ca-8b2d-da43e62eace1';

-- Governo PA 2026: Well Macedo, Beto Faro, Eder Mauro, Igor Normando, Mario
-- Couto e Ruth Reis não são candidatos ao cargo — desativar. (Beto Faro e
-- Eder Mauro seguem ativos em Senador PA 2026 quando aplicável)
update candidates
set is_active = false
where id in (
  '67f9ce6e-e8cf-4441-a752-29a9244b3765', -- Well Macedo, Governador PA 2026
  '3d1747f0-eeed-44a4-a824-10173b93c5fd', -- Beto Faro, Governador PA 2026
  '8d9de8d2-db9d-4476-95c3-618bf4c0eda8', -- Eder Mauro, Governador PA 2026
  '7953796e-36b1-46d5-bba1-0c899461d6df', -- Igor Normando, Governador PA 2026
  '27c98d3d-1a0f-4272-afac-082fc11ec5f9', -- Mario Couto, Governador PA 2026
  '31ef5416-2622-4cba-a60e-00866ee90560'  -- Ruth Reis, Governador PA 2026
)
and election_id = 'be63d720-45a8-4ff0-830b-93f3f135a2c3';

-- Senado PA 2026: Beto Faro não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = '05b35876-5eee-48dd-adec-469049baaca5' -- Beto Faro, Senador PA 2026
  and election_id = '1ee99670-fba4-442f-afa8-9ec802009846';
