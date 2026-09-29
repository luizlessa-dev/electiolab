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
  // Try to see unique constraints from information_schema
  const { data, error } = await sb.rpc('execute_raw_sql', {
    query: `
      SELECT constraint_name, column_name 
      FROM information_schema.constraint_column_usage 
      WHERE table_name = 'poll_drafts' AND constraint_name LIKE '%unique%'
    `
  }).catch(() => ({ data: null, error: 'RPC not available' }));
  
  if (data) {
    console.log('Unique constraints on poll_drafts:');
    console.log(data);
  } else {
    console.log('Cannot query constraints via RPC.');
    console.log('The constraint "poll_drafts_unique_scenario" likely involves:');
    console.log('  - election_id');
    console.log('  - institute_name OR institute_id');
    console.log('  - scenario_label');
  }
})();
