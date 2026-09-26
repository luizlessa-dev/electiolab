-- Correção definitiva do timeout de /eleicao-2018 e /eleicao-2022 (páginas
-- índice, sem [uf]): elas chamam getHistoricElectionData(year) SEM filtro de
-- estado, ou seja, paginam a tabela prior_election_results inteira para o
-- ano (year=2018: 1.033.718 linhas; year=2022: 1.855.737 linhas) e agregam
-- em JS. O índice idx_prior_election_results_year_round_state (já aplicado)
-- resolve o timeout de statement, mas não o volume: são ~1M+ linhas
-- trafegadas por visita, e por isso essas 2 páginas foram marcadas
-- force-dynamic (sem cache) — ver src/app/(marketing)/eleicao-2018/page.tsx.
--
-- Esta view materializada pré-agrega exatamente o que essas páginas
-- exibem: 1 linha por (year, election_type, state, candidate_id), com
-- total_votes somado entre municípios e o melhor result_status — a mesma
-- agregação que hoje acontece em JS em getHistoricElectionData (ver
-- STATUS_RANK em src/lib/queries/historic-elections.ts; a ordem do CASE
-- abaixo tem que ficar em sincronia com esse array). Isso reduz o dataset
-- de ~1M linhas brutas por ano para a contagem de candidatos únicos por
-- ano (ordens de magnitude menor), e tira o JOIN com candidates do
-- caminho quente.

CREATE MATERIALIZED VIEW IF NOT EXISTS historic_election_state_summary AS
SELECT
  per.year,
  per.election_type,
  per.state,
  per.candidate_id,
  c.name AS candidate_name,
  c.slug AS candidate_slug,
  MIN(per.party) AS party,
  SUM(per.total_votes)::integer AS total_votes,
  (array_agg(per.result_status ORDER BY
    CASE per.result_status
      WHEN 'eleito' THEN 0
      WHEN '2t_disputou' THEN 1
      WHEN 'suplente' THEN 2
      WHEN 'renunciou' THEN 3
      WHEN 'cassado' THEN 4
      WHEN 'nao_eleito' THEN 5
      ELSE 6
    END
  ))[1] AS result_status
FROM prior_election_results per
JOIN candidates c ON c.id = per.candidate_id
WHERE per.round = 1
  AND c.slug IS NOT NULL -- "candidato sem perfil ativo — pula", mesma regra do JS
GROUP BY per.year, per.election_type, per.state, per.candidate_id, c.name, c.slug;

-- Necessário para REFRESH MATERIALIZED VIEW CONCURRENTLY (evita lock de
-- leitura durante o refresh — a view é consultada por página pública).
CREATE UNIQUE INDEX IF NOT EXISTS idx_historic_election_state_summary_pk
  ON historic_election_state_summary (year, election_type, state, candidate_id);

-- Leitura pública, mesma exposição que prior_election_results e candidates
-- já têm ("Public read prior" / policies equivalentes) — materialized view
-- não aceita RLS diretamente, só GRANT.
GRANT SELECT ON historic_election_state_summary TO anon, authenticated;

-- RPC pra rodar o refresh a partir do script de ingestão (scripts/ingest-tse-prior-results.ts),
-- via supabase-js .rpc(...) com o client de service_role — só ele pode
-- chamar (mesmo padrão de set_custom_quota em custom_quotas.sql).
CREATE OR REPLACE FUNCTION refresh_historic_election_state_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY historic_election_state_summary;
END;
$$;

REVOKE EXECUTE ON FUNCTION refresh_historic_election_state_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_historic_election_state_summary() TO service_role;
