# Approval/Rejection Polling Data Setup

## Status
✅ Migration created: `supabase/migrations/1722781200_create_approval_polls.sql`

## Next Steps

### 1. Apply Migration to Supabase
Execute the SQL in your Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy-paste the entire content of `supabase/migrations/1722781200_create_approval_polls.sql`
4. Click "Run"

This will:
- Create the `approval_polls` table
- Set up RLS policies (public read, admin write)
- Create indexes for performance

### 2. Insert Initial Data
After migration is applied, run one of these:

**Option A: Via Supabase SQL Editor**
```sql
INSERT INTO approval_polls (
  institute_id, institute_name, subject_label, subject_slug, office, scope, metric,
  publication_date, fieldwork_end, sample_size, margin_of_error, methodology, source_url,
  pct_aprova, pct_desaprova, pct_nsnr
) VALUES
  ('38744dae-cbdf-4ed1-84f9-ada191886146', 'Datafolha', 'Lula', 'lula', 'presidente', 'nacional', 'binary',
   '2026-07-28', '2026-07-27', 2004, '2.20', 'telefonica', 'https://datafolha.com.br/lula-2026',
   37.0, 58.0, 5.0),
  -- (more rows...see insert-sample-data.sql)
;
```

**Option B: Via local Node script** (requires SUPABASE_SERVICE_ROLE_KEY in .env.local)
```bash
node scripts/populate-approval-polls.mjs
```

### 3. Verify Data
Check that data appears on:
- http://localhost:3000/aprovacao-governo-lula (Lula approval)
- http://localhost:3000/rejeicao-candidatos-presidente-2026 (candidate rejection)

### 4. Create PR
Once verified:
```bash
git add .
git commit -m "feat: populate approval polling data for Lula government"
git push origin main
```

## Data Structure
- **Metric types**: `binary` (aprova/desaprova), `rating` (ótimo/bom/regular/ruim/péssimo), `rejection`
- **Institutes**: Must reference existing institute IDs:
  - Datafolha: `38744dae-cbdf-4ed1-84f9-ada191886146`
  - Quaest: `6aab34cd-f773-4ba6-9c8b-d4569ed273d2`
  - Atlas Intel: `9441a73b-5eee-497f-8084-d7893cc14ac9`

## Troubleshooting

**"RLS policy violation"**: User doesn't have insert permission
→ Use admin key or execute as Supabase dashboard user

**"Institute not found"**: institute_id doesn't exist
→ Check institute UUIDs in institutes table

**Pages still empty**: Data may not be indexed yet
→ Rebuild: `npm run build`
→ Restart dev server: `npm run dev`
