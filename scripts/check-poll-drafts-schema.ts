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
  const { data, error } = await sb
    .from('poll_drafts')
    .select()
    .limit(1);
  
  if (data?.length) {
    console.log('poll_drafts columns:');
    const cols = Object.keys(data[0]);
    cols.forEach(c => console.log(`  - ${c}`));
  } else if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('No data found (table might be empty)');
    console.log('Trying with wildcard *...');
    const { data: raw } = await sb.rpc('get_columns', { table_name: 'poll_drafts' }).then(r => ({ data: r.data }), () => ({ data: null }));
    if (raw) console.log('Columns:', raw);
  }
})();
