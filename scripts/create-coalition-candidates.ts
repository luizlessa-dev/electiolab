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
  const coalitions = [
    'PT-Aliados', 'PL-Aliados', 'Centro', 'Centro-Direita',
    'PSD-Aliados', 'PSDB-Aliados', 'PP-Aliados', 'PDT-Aliados', 'MDB', 'Outros'
  ];
  
  for (const name of coalitions) {
    const { error } = await sb.from('candidates').insert({
      name,
      slug: name.toLowerCase().replace(/[\s-]/g, '-'),
      party: 'COLIGACAO',
      state: 'BR'
    });
    
    if (error) {
      if (error.message.includes('duplicate')) console.log(`⏭️  ${name}`);
      else console.log(`❌ ${name}: ${error.message}`);
    } else {
      console.log(`✅ ${name}`);
    }
  }
})();
