-- Deduplicação: "Antônio Barros" (id 7ccd2cbc, slug antonio-barros) vs
-- "Antônio Barros" (id 263562e2, slug antonio-barros-2) em Senador Piauí
-- 2026 — mesmo CPF (35389788320), mesmo net_worth declarado (R$1.896.000),
-- mesmo lote de ingestão, dois tse_id diferentes.
--
-- Canônico: 7ccd2cbc, que tem poll_results (2), weighted_averages (1),
-- receita (10), despesa contratada/paga (3/3), FEFC e rede social — dados da
-- candidatura ativa. 263562e2 só tinha bens (32) e 2 redes sociais já
-- duplicadas (mesmas URLs, variação de maiúscula) das que já existem no
-- canônico.
update candidate_assets
set candidate_id = '7ccd2cbc-2008-46cf-999c-c94961b4a8f4'
where candidate_id = '263562e2-9b06-4c53-8481-16313ea35717';

delete from candidate_social_media
where candidate_id = '263562e2-9b06-4c53-8481-16313ea35717';

update candidates
set slug = null
where id = '263562e2-9b06-4c53-8481-16313ea35717';

update candidates
set is_active = false
where id = '263562e2-9b06-4c53-8481-16313ea35717';
