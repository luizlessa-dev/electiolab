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
  // Count all deputado polls
  const { data: all } = await sb.from('polls').select('id, office, scope, election_id, institute_name, candidate').eq('office', 'deputado').limit(50);
  console.log(`Total deputado polls: ${all?.length || 0}`);
  
  if (all?.length) {
    console.log('\nBy scope:');
    const byScope = {};
    all.forEach(p => {
      const s = p.scope || 'NULL';
      if (!byScope[s]) byScope[s] = 0;
      byScope[s]++;
    });
    Object.entries(byScope).forEach(([scope, count]) => console.log(`  ${scope}: ${count}`));
    
    console.log('\nSample polls:');
    all.slice(0, 5).forEach(p => console.log(`  ${p.institute_name} | ${p.candidate} | scope=${p.scope}`));
  }
})();
