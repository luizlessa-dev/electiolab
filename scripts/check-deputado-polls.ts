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
  // 1. Get SP election
  const { data: spElection } = await sb.from('elections').select('id').eq('type', 'deputado_federal').eq('state', 'SP').eq('year', 2026).single();
  console.log('SP deputado_federal election_id:', spElection?.id);
  
  if (!spElection) return;
  
  // 2. Count polls with that election_id
  const { data: pollsCount, error: countError } = await sb.from('polls').select('id', { count: 'exact' }).eq('election_id', spElection.id).eq('office', 'deputado');
  console.log('Polls with SP election_id:', pollsCount?.length || 0);
  
  // 3. Show first 3 polls
  const { data: polls } = await sb.from('polls').select('id, candidate, percentage, scope, source_kind, institute_name').eq('election_id', spElection.id).eq('office', 'deputado').limit(3);
  if (polls?.length) {
    console.log('\nFirst 3 polls:');
    polls.forEach(p => console.log(`  ${p.institute_name} | ${p.candidate} | ${p.percentage}% | scope=${p.scope} | source=${p.source_kind}`));
  }
})();
