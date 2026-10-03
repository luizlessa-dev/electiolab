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
  // Find deputado elections
  const { data: elections } = await sb.from('elections').select('id, state').eq('type', 'deputado_federal').eq('year', 2026);
  const depElections = elections || [];
  console.log(`deputado_federal elections: ${depElections.length}`);
  
  if (depElections.length) {
    const ids = depElections.map(e => e.id);
    const { data: polls } = await sb.from('polls').select('id, election_id, institute_id').in('election_id', ids);
    console.log(`Polls with deputado_federal election_id: ${polls?.length || 0}`);
  }
})();
