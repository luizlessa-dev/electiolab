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
  // Get ALL 31 deputado polls
  const { data: elections } = await sb.from('elections').select('id').eq('type', 'deputado_federal').eq('year', 2026);
  const ids = elections?.map(e => e.id) || [];
  
  const { data: polls } = await sb.from('polls').select('id').in('election_id', ids);
  console.log(`31 deputado polls found`);
  
  // Count total poll_results for these polls
  if (polls?.length) {
    const pollIds = polls.map(p => p.id);
    const { data: results } = await sb.from('poll_results').select('poll_id', { count: 'exact' }).in('poll_id', pollIds);
    console.log(`Total poll_results: ${results?.length || 0}`);
    
    // Check which polls have 0 results
    const byPoll = {};
    results?.forEach(r => {
      if (!byPoll[r.poll_id]) byPoll[r.poll_id] = 0;
      byPoll[r.poll_id]++;
    });
    const withoutResults = polls.filter(p => !byPoll[p.id]);
    console.log(`Polls without results: ${withoutResults.length}/${polls.length}`);
  }
})();
