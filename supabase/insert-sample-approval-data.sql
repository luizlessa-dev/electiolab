-- Insert sample approval polling data for Lula government
-- Copy-paste this into Supabase SQL Editor after running the migration

INSERT INTO approval_polls (
  institute_id, institute_name, subject_label, subject_slug, office, scope, metric,
  publication_date, fieldwork_end, sample_size, margin_of_error, methodology, source_url,
  pct_aprova, pct_desaprova, pct_nsnr
) VALUES
  -- Datafolha - binary metric
  ('38744dae-cbdf-4ed1-84f9-ada191886146', 'Datafolha', 'Lula', 'lula', 'presidente', 'nacional', 'binary',
   '2026-07-28', '2026-07-27', 2004, '2.20', 'telefonica', 'https://datafolha.com.br/lula-2026',
   37.0, 58.0, 5.0),
  -- Quaest - binary metric
  ('6aab34cd-f773-4ba6-9c8b-d4569ed273d2', 'Quaest', 'Lula', 'lula', 'presidente', 'nacional', 'binary',
   '2026-07-26', '2026-07-25', 2000, '2.20', 'online', 'https://quaest.com.br/lula-2026',
   36.0, 59.0, 5.0),
  -- Atlas Intel - binary metric
  ('9441a73b-5eee-497f-8084-d7893cc14ac9', 'Atlas Intel', 'Lula', 'lula', 'presidente', 'nacional', 'binary',
   '2026-07-20', '2026-07-19', 5032, '1.40', 'online', 'https://atlasintel.com.br/lula-2026',
   38.5, 57.0, 4.5);

INSERT INTO approval_polls (
  institute_id, institute_name, subject_label, subject_slug, office, scope, metric,
  publication_date, fieldwork_end, sample_size, margin_of_error, methodology, source_url,
  pct_otimo, pct_bom, pct_regular, pct_ruim, pct_pessimo
) VALUES
  -- Datafolha - rating metric
  ('38744dae-cbdf-4ed1-84f9-ada191886146', 'Datafolha', 'Lula', 'lula', 'presidente', 'nacional', 'rating',
   '2026-07-28', '2026-07-27', 2004, '2.20', 'telefonica', 'https://datafolha.com.br/lula-2026',
   8.0, 28.0, 18.0, 22.0, 24.0),
  -- Quaest - rating metric
  ('6aab34cd-f773-4ba6-9c8b-d4569ed273d2', 'Quaest', 'Lula', 'lula', 'presidente', 'nacional', 'rating',
   '2026-07-26', '2026-07-25', 2000, '2.20', 'online', 'https://quaest.com.br/lula-2026',
   7.0, 29.0, 17.0, 23.0, 24.0);

-- Verify data was inserted
SELECT metric, COUNT(*) as count FROM approval_polls WHERE subject_slug = 'lula' GROUP BY metric;
