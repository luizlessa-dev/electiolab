import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não carregadas!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Gaffes to ingest (manually curated from Poder360)
const gaffes = [
  {
    candidate_slug: 'lula',
    title: 'Fala sobre mulheres aprender a "tomar toque"',
    description: 'Lula disse que mulheres aprendem a "tomar toque" desde pequenas, gerando críticas',
    statement: 'Mulheres aprendem a tomar toque desde pequenas',
    context: 'Fala controversial durante campanha sobre relação entre homens e mulheres',
    date_event: '2026-09-29',
    source_url: 'https://www.poder360.com.br/eleicoes-2026',
    source_name: 'Poder360',
    status: 'reported',
    category: 'controversial',
    fact_checked: false,
    created_by: 'manual-ingest',
  },
  {
    candidate_slug: 'flavio-bolsonaro',
    title: 'Mudanças nas versões sobre caso Vorcaro',
    description: 'Flávio mudou de versão sobre como procurador Vorcaro foi transferido',
    statement: 'Múltiplas versões sobre transferência de Vorcaro para Papuda',
    context: 'Caso envolve discrepâncias nas explicações do candidato sobre ação judicial',
    date_event: '2026-09-29',
    source_url: 'https://www.poder360.com.br/eleicoes-2026',
    source_name: 'Poder360',
    status: 'verified',
    category: 'contradiction',
    fact_checked: true,
    created_by: 'manual-ingest',
  },
  {
    candidate_slug: 'lula',
    title: 'Janja em fake news sobre Nossa Senhora',
    description: 'Esposa de Lula envolvida em compartilhamento de fake news sobre Nossa Senhora Aparecida',
    statement: 'Janja compartilhou conteúdo questionável em redes sociais',
    context: 'Controversa envolvendo fake news durante período eleitoral',
    date_event: '2026-09-28',
    source_url: 'https://www.poder360.com.br/eleicoes-2026',
    source_name: 'Poder360',
    status: 'reported',
    category: 'false_statement',
    fact_checked: true,
    fact_check_result: 'false',
    created_by: 'manual-ingest',
  },
];

async function main() {
  console.log('🔄 Iniciando ingest de gaffes...\n');

  for (const gaffe of gaffes) {
    try {
      // 1. Find candidate by slug
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('slug', gaffe.candidate_slug)
        .single();

      if (candidateError || !candidate) {
        console.log(`❌ Candidato não encontrado: ${gaffe.candidate_slug}`);
        console.log(`   Erro: ${candidateError?.message}\n`);
        continue;
      }

      // 2. Insert gaffe
      const { data, error } = await supabase
        .from('candidate_gaffes')
        .insert({
          candidate_id: candidate.id,
          title: gaffe.title,
          description: gaffe.description,
          statement: gaffe.statement,
          context: gaffe.context,
          date_event: new Date(gaffe.date_event).toISOString(),
          source_url: gaffe.source_url,
          source_name: gaffe.source_name,
          status: gaffe.status,
          category: gaffe.category,
          fact_checked: gaffe.fact_checked,
          fact_check_result: gaffe.fact_check_result || null,
          created_by: gaffe.created_by,
        })
        .select();

      if (error) {
        console.log(`❌ Erro ao inserir gaffe: ${gaffe.title}`);
        console.log(`   Erro: ${error.message}\n`);
        continue;
      }

      console.log(`✅ Inserido: ${gaffe.title}`);
      console.log(`   Candidato: ${gaffe.candidate_slug}`);
      console.log(`   ID: ${data?.[0]?.id}\n`);
    } catch (err) {
      console.log(`❌ Erro inesperado: ${err}\n`);
    }
  }

  console.log('✨ Ingest completo!');
  console.log('\n📊 Verificando dados...');

  // Verify
  const { data: count, error: countError } = await supabase
    .from('candidate_gaffes')
    .select('*', { count: 'exact' });

  console.log(`\nTotal de gaffes no banco: ${count?.length || 0}`);
}

main().catch(console.error);
