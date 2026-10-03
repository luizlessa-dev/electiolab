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
  // Get SP deputado election
  const { data: sp } = await sb.from('elections').select('id').eq('type', 'deputado_federal').eq('state', 'SP').eq('year', 2026).single();
  console.log('SP deputado_federal election:', sp?.id);

  if (!sp) return;

  // Get polls for that election
  const { data: polls } = await sb.from('polls').select('id, publication_date, institute_id').eq('election_id', sp.id).order('publication_date', { ascending: false });
  console.log(`Polls for SP: ${polls?.length || 0}`);

  if (polls?.length) {
    // Check if first poll has results
    const firstPoll = polls[0];
    const { data: results } = await sb.from('poll_results').select('id, percentage').eq('poll_id', firstPoll.id);
    console.log(`\nFirst poll (${firstPoll.id}) has ${results?.length || 0} results`);
    if (results?.length) {
      results.slice(0, 3).forEach(r => console.log(`  - ${r.percentage}%`));
    }
  }
})();
