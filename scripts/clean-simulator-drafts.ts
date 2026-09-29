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
  const { data: toDelete } = await sb.from('poll_drafts').select('id').eq('source_kind', 'simulated');
  console.log(`Found ${toDelete?.length || 0} simulated drafts`);
  
  if (toDelete?.length) {
    const ids = toDelete.map(d => d.id);
    const { error } = await sb.from('poll_drafts').delete().in('id', ids);
    if (error) console.log('Error:', error.message);
    else console.log(`Deleted ${toDelete.length} records`);
  }
})();
