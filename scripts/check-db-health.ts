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
  const tables = ['polls', 'poll_drafts', 'elections', 'institutes', 'candidates'];
  
  for (const table of tables) {
    const { data, error } = await sb.from(table).select('id', { count: 'exact' }).limit(1);
    const count = data?.length === 0 ? '0' : '?';
    console.log(`${table}: ${count} (error: ${error?.message || 'none'})`);
  }
})();
