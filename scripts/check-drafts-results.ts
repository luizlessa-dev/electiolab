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
  // Get Datafolha draft
  const { data: drafts } = await sb.from('poll_drafts').select('id, results').eq('institute_name', 'Datafolha').limit(1);
  if (drafts?.length) {
    const d = drafts[0];
    console.log(`Datafolha draft results:`, d.results);
    console.log(`Type:`, typeof d.results);
    if (Array.isArray(d.results)) {
      console.log(`Count: ${d.results.length}`);
      d.results.slice(0, 2).forEach(r => console.log(`  - ${JSON.stringify(r)}`));
    }
  }
})();
