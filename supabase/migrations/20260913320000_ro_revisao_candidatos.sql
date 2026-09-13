-- Revisão de candidatos oficiais x pesquisas: Rondônia (Senado e Governo)
--
-- Fernando Máximo migrou de candidatura: não é mais candidato ao Governo,
-- e sim ao Senado. O registro de Senado já existia no banco (mesmo CPF
-- 86309439120), só estava inativo — reativar em vez de criar novo registro.

-- Governo RO 2026: Fernando Maximo não é candidato ao cargo — desativar.
update candidates
set is_active = false
where id = '0a17c90a-e3ba-4117-9cba-fb27afc7d781' -- Fernando Maximo, Governador Rondonia 2026
  and election_id = '55e062ad-9fb2-437f-8bfc-0679caaecd06';

-- Senado RO 2026: Fernando Máximo é candidato ao cargo — reativar registro
-- já existente.
update candidates
set is_active = true
where id = 'f3d42666-f007-4ea2-b532-e87306231cdf' -- Fernando Máximo, Senador Rondonia 2026
  and election_id = '845efc11-43af-4a57-9677-c995b3f8e31a';
