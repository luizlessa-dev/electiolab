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
  const { data: drafts } = await sb.from('poll_drafts').select('id, office, scope, institute_name, candidate, source_kind').eq('office', 'deputado').limit(50);
  console.log(`poll_drafts with office=deputado: ${drafts?.length || 0}`);
  
  if (drafts?.length) {
    console.log('\nBy scope:');
    const byScope = {};
    drafts.forEach(p => {
      const s = p.scope || 'NULL';
      if (!byScope[s]) byScope[s] = 0;
      byScope[s]++;
    });
    Object.entries(byScope).forEach(([scope, count]) => console.log(`  ${scope}: ${count}`));
    
    console.log('\nBy source_kind:');
    const bySource = {};
    drafts.forEach(p => {
      if (!bySource[p.source_kind]) bySource[p.source_kind] = 0;
      bySource[p.source_kind]++;
    });
    Object.entries(bySource).forEach(([src, count]) => console.log(`  ${src}: ${count}`));
  }
})();
