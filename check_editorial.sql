SELECT slug, LENGTH(editorial_bio) as bio_len, editorial_summary FROM candidates WHERE editorial_bio IS NOT NULL ORDER BY slug;
