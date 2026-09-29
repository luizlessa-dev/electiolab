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
  const data = JSON.parse(fs.readFileSync('data/pesqele_deputado_import.json', 'utf-8'));
  const polls = data.deputado_federal_polls || [];
  
  console.log(`Attempting to insert ${polls.length} polls...`);
  
  for (const poll of polls) {
    const pollDraft = {
      election_id: 'dummy', // Will be updated
      institute_name: poll.institute,
      candidate: 'N/A',
      fieldwork_start: poll.fieldwork_start,
      fieldwork_end: poll.fieldwork_end,
      publication_date: poll.publication_date,
      sample_size: poll.sample_size,
      margin_of_error: poll.margin_of_error,
      methodology: 'presencial',
      source_url: poll.source_url,
      source_kind: 'tier1-manual',
      status: 'approved',
      round: 1,
      office: 'deputado',
      results: [],
      notes: poll.notes,
    };
    
    const { error } = await sb.from('poll_drafts').insert([pollDraft]);
    if (error?.code === '23505') {
      console.log(`  ⚠️  ${poll.institute}: Duplicate (ignoring)`);
    } else if (error) {
      console.log(`  ❌ ${poll.institute}: ${error.message}`);
    } else {
      console.log(`  ✅ ${poll.institute}: Inserted`);
    }
  }
})();
