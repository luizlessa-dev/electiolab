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
  
  // Get all deputado polls
  const { data: polls } = await sb.from('polls').select('id, promoted_poll_id').in('election_id', elecIds);
  console.log(`Found ${polls?.length} deputado polls`);
  
  if (!polls?.length) return;
  
  // Get poll_drafts that were promoted (have promoted_poll_id set)
  const draftIds = polls.filter(p => p.promoted_poll_id).map(p => p.promoted_poll_id);
  const { data: drafts } = await sb.from('poll_drafts').select('id, results, promoted_poll_id').in('id', draftIds);
  console.log(`Found ${drafts?.length} promoted drafts`);
  
  let created = 0;
  
  // For each draft with results
  for (const draft of drafts || []) {
    if (!Array.isArray(draft.results) || draft.results.length === 0) continue;
    
    const pollId = draft.promoted_poll_id;
    if (!pollId) continue;
    
    // Check if this poll already has results
    const { data: existing } = await sb.from('poll_results').select('id').eq('poll_id', pollId);
    if (existing?.length) continue; // Already has results
    
    console.log(`  Creating results for poll ${pollId}...`);
    
    // For each result, try to create poll_result
    for (const result of draft.results) {
      const { pct, name } = result;
      
      // Try to find candidate by name
      const { data: candidates } = await sb.from('candidates').select('id').ilike('name', `%${name}%`).limit(1);
      const candidateId = candidates?.[0]?.id || null;
      
      const { error } = await sb.from('poll_results').insert({
        poll_id: pollId,
        candidate_id: candidateId,
        percentage: pct,
        excluded_reason: null
      });
      
      if (error) {
        console.log(`    ❌ ${name}: ${error.message}`);
      } else {
        console.log(`    ✅ ${name}: ${pct}%`);
        created++;
      }
    }
  }
  
  console.log(`\nCreated ${created} poll_results`);
})();
