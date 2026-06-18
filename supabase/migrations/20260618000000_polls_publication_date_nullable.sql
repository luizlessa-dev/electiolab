-- publication_date não vem de Wikipedia (só do TSE), então deve ser nullable
-- igual methodology (já nullable desde 20260517020237)
ALTER TABLE polls ALTER COLUMN publication_date DROP NOT NULL;
