import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase
    .from('candidates')
    .select('name, slug')
    .order('name')
    .limit(30);

  if (error) {
    console.error('Erro:', error.message);
  } else {
    console.log('📋 Candidatos (primeiros 30):\n');
    data?.forEach((c) => {
      console.log(`  ${c.name.padEnd(40)} → "${c.slug}"`);
    });
  }
}

main();
