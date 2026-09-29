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
  // Simple check
  const { data: elections } = await sb.from('elections').select('id').eq('type', 'deputado_federal').limit(2);
  console.log('Elections:', elections?.length);
  
  if (elections?.length) {
    const { data: polls } = await sb.from('polls').select('*').eq('election_id', elections[0].id).limit(1);
    console.log('Polls for first election:', polls?.length);
    if (polls?.length) {
      console.log('First poll promoted_poll_id:', polls[0].promoted_poll_id);
    }
  }
})();
