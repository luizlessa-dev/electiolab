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
  const { data } = await sb.from('poll_drafts').select('id, institute_name, scenario_label, source_kind').order('institute_name');
  console.log(`poll_drafts (${data?.length}):`);
  const byInstitute = {};
  data?.forEach(d => {
    if (!byInstitute[d.institute_name]) byInstitute[d.institute_name] = 0;
    byInstitute[d.institute_name]++;
  });
  Object.entries(byInstitute).forEach(([inst, count]) => console.log(`  ${inst}: ${count}`));
  
  console.log('\nSearching for Datafolha/Atlas/Paraná:');
  ['Datafolha', 'Atlas Intel', 'Paraná Pesquisas'].forEach(inst => {
    const found = data?.filter(d => d.institute_name === inst);
    console.log(`  ${inst}: ${found?.length || 0}`);
  });
})();
