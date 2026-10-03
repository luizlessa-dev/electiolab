import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const envFile = path.join(process.cwd(), '.env.local');
for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  // Get all deputado elections
  const { data: elections } = await sb.from('elections').select('id').eq('type', 'deputado_federal').eq('year', 2026);
  const elecIds = elections?.map(e => e.id) || [];
  console.log(`Found ${elecIds.length} deputado elections`);
  
  if (!elecIds.length) return;
  
  // Get all deputado polls with raw_data
  const { data: polls } = await sb.from('polls').select('id, raw_data').in('election_id', elecIds);
  console.log(`Found ${polls?.length} deputado polls`);
  
  let created = 0;
  let skipped = 0;
  
  for (const poll of polls || []) {
    // Check if already has results
    const { data: existing } = await sb.from('poll_results').select('id').eq('poll_id', poll.id);
    if (existing?.length) {
      skipped++;
      continue;
    }
    
    // Create results from raw_data
    if (Array.isArray(poll.raw_data) && poll.raw_data.length > 0) {
      for (const item of poll.raw_data) {
        const { error } = await sb.from('poll_results').insert({
          poll_id: poll.id,
          candidate_id: null,
          percentage: item.pct
        });

        if (error) {
          console.log(`  ❌ Error for ${item.name}: ${error.message}`);
        } else {
          console.log(`  ✅ ${item.name}: ${item.pct}%`);
          created++;
        }
      }
    } else {
      console.log(`  ⚠️  No raw_data`);
    }
  }
  
  console.log(`Created: ${created}, Skipped: ${skipped}`);
})();
