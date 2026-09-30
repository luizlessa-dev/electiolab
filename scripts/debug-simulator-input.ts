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
  const { data: presPolls } = await sb.from('poll_drafts').select('results, fieldwork_end').eq('source_kind', 'tier2-presidencial').order('fieldwork_end', { ascending: false }).limit(1);
  
  if (presPolls?.length) {
    console.log('Presidential data que o simulador usa:');
    console.log(JSON.stringify(presPolls[0], null, 2));
  }
})();
