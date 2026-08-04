SELECT id, slug, editorial_bio IS NOT NULL as has_bio, editorial_published_at FROM candidates WHERE slug = 'lula';
