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
  const { data: tier1 } = await sb.from('poll_drafts').select('institute_name, scope, results').eq('source_kind', 'tier1-manual').limit(3);
  console.log(`Tier 1 data (${tier1?.length}):`);
  tier1?.forEach(t => {
    console.log(`\n${t.institute_name} (${t.scope}):`);
    console.log(JSON.stringify(t.results, null, 2));
  });
})();
