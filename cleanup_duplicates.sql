-- For each slug with multiple editorial_bio entries, keep only the latest one
UPDATE candidates
SET editorial_bio = NULL, editorial_summary = NULL, editorial_published_at = NULL
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY editorial_published_at DESC NULLS LAST) as rn
    FROM candidates
    WHERE editorial_bio IS NOT NULL
  ) ranked
  WHERE rn > 1
);
