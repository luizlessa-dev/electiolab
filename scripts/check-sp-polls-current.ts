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
  // Get all deputado polls with scope=SP
  const { data: polls } = await sb.from('polls').select('id, election_id, candidate, scope, institute_name, source_kind').eq('office', 'deputado').eq('scope', 'SP');
  console.log(`Polls with office=deputado and scope=SP: ${polls?.length || 0}`);
  if (polls?.length) {
    const byElection = {};
    polls.forEach(p => {
      if (!byElection[p.election_id]) byElection[p.election_id] = [];
      byElection[p.election_id].push(p);
    });
    Object.entries(byElection).forEach(([eid, plist]) => {
      console.log(`\n  election_id: ${eid} (${(plist as any[]).length} polls)`);
      (plist as any[]).slice(0, 2).forEach(p => console.log(`    - ${p.institute_name} | ${p.candidate}`));
    });
  }
})();
