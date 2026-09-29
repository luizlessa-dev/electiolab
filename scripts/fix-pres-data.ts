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
  const { data: toFix } = await sb.from('poll_drafts').select('id, results').eq('source_kind', 'tier2-presidencial');
  
  for (const poll of toFix || []) {
    const fixed = (poll.results || []).map(r => ({
      ...r,
      name: r.name === 'vio' ? 'Bolsonaro' : r.name
    }));
    
    await sb.from('poll_drafts').update({ results: fixed }).eq('id', poll.id);
  }
  
  console.log(`✅ Fixed ${toFix?.length || 0} polls (vio → Bolsonaro)`);
})();
