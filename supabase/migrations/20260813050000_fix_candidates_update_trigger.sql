-- candidates_update_trigger chamava update_updated_at(), que seta NEW.updated_at —
-- mas candidates nunca teve coluna updated_at (só created_at). Todo UPDATE na
-- tabela quebrava com "record new has no field updated_at". Achado ao tentar
-- aplicar a ingestão de candidaturas 2026 em 2026-08-13. election_results tem o
-- mesmo trigger e tem a coluna, então o problema é específico de candidates —
-- removendo o trigger em vez de adicionar uma coluna que nada mais usa.
drop trigger if exists candidates_update_trigger on candidates;
