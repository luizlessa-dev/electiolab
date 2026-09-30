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
  const { data } = await sb.from('poll_drafts').select('id, office, institute_name, candidate').limit(20);
  console.log(`Total poll_drafts: ${data?.length || 0}`);
  if (data?.length) {
    const byOffice = {};
    data.forEach(p => {
      if (!byOffice[p.office]) byOffice[p.office] = [];
      byOffice[p.office].push(p);
    });
    Object.entries(byOffice).forEach(([office, items]) => {
      console.log(`\n${office}: ${(items as any[]).length}`);
      (items as any[]).slice(0, 2).forEach(p => console.log(`  - ${p.institute_name} | ${p.candidate}`));
    });
  }
})();
