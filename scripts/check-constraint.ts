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
  // Try to find what's causing the conflict - search by one of the institutes
  const { data } = await sb.from('poll_drafts').select('id, institute_name, candidate, election_id, fieldwork_end, scenario_label').eq('institute_name', 'Datafolha');
  console.log(`Datafolha polls in drafts: ${data?.length || 0}`);
  if (data?.length) {
    data.forEach(p => console.log(`  ${p.candidate} | ${p.fieldwork_end} | ${p.scenario_label}`));
  }
})();
