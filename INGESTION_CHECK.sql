-- 🔍 Verificar status de ingestão de eleições 2026

-- 1. Presidência
SELECT 'Presidência' as cargo, COUNT(*) as total, MAX(created_at) as última_ingestão
FROM elections
WHERE type = 'presidencial' AND year = 2026;

-- 2. Governadores - contar estados únicos
SELECT 'Governadores' as cargo, COUNT(DISTINCT state) as estados, MAX(created_at) as última_ingestão
FROM elections
WHERE type = 'governador' AND year = 2026;

-- 3. Senadores - contar estados únicos
SELECT 'Senadores' as cargo, COUNT(DISTINCT state) as estados, MAX(created_at) as última_ingestão
FROM elections
WHERE type = 'senador' AND year = 2026;

-- 4. Resumo geral de pesquisas
SELECT
  e.type,
  COUNT(DISTINCT p.id) as total_pesquisas,
  MAX(p.publication_date) as mais_recente
FROM elections e
LEFT JOIN polls p ON e.id = p.election_id
WHERE e.year = 2026
GROUP BY e.type
ORDER BY e.type;

-- 5. Estados com Governadores (verificar os 27)
SELECT ARRAY_AGG(DISTINCT state ORDER BY state) as estados
FROM elections
WHERE type = 'governador' AND year = 2026;

-- 6. Estados com Senadores (verificar os 27)
SELECT ARRAY_AGG(DISTINCT state ORDER BY state) as estados
FROM elections
WHERE type = 'senador' AND year = 2026;
