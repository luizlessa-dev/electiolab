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
  const { data: results } = await sb.from('poll_results').select('percentage, candidate:candidates(name)', { count: 'exact' }).limit(10);
  console.log(`poll_results rows: ${results?.length || 0}`);
  if (results?.length) {
    results.slice(0, 3).forEach(r => {
      const c = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
      console.log(`  ${c?.name}: ${r.percentage}%`);
    });
  }
})();
