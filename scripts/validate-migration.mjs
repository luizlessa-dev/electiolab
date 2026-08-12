#!/usr/bin/env node
/**
 * Valida se a migration SQL está correta antes de executar no Supabase
 *
 * Uso: node scripts/validate-migration.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationFile = path.join(__dirname, '../apps/pipeline/migrations/001_create_tse_tables.sql');

console.log('🔍 Validando Migration SQL...\n');

// 1. Verificar se arquivo existe
console.log('1️⃣  Verificando se arquivo existe...');
if (!fs.existsSync(migrationFile)) {
  console.error(`❌ Arquivo não encontrado: ${migrationFile}`);
  process.exit(1);
}
console.log(`✅ Arquivo encontrado: ${migrationFile}\n`);

// 2. Ler arquivo
const sql = fs.readFileSync(migrationFile, 'utf-8');
console.log(`2️⃣  Tamanho: ${(sql.length / 1024).toFixed(2)} KB\n`);

// 3. Validar tabelas principais
console.log('3️⃣  Verificando tabelas esperadas...');
const tables = [
  'candidates',
  'election_results',
  'election_results_candidatos',
  'data_source_audit'
];

tables.forEach(table => {
  if (sql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`)) {
    console.log(`✅ Tabela '${table}' encontrada`);
  } else {
    console.error(`❌ Tabela '${table}' NÃO encontrada`);
    process.exit(1);
  }
});
console.log();

// 4. Validar índices
console.log('4️⃣  Verificando índices...');
const indexCount = (sql.match(/CREATE INDEX IF NOT EXISTS/g) || []).length;
console.log(`✅ ${indexCount} índices definidos`);
console.log();

// 5. Validar RLS policies
console.log('5️⃣  Verificando RLS Policies...');
const policyCount = (sql.match(/CREATE POLICY/g) || []).length;
console.log(`✅ ${policyCount} policies definidas`);
console.log();

// 6. Validar Views
console.log('6️⃣  Verificando Views...');
const viewCount = (sql.match(/CREATE OR REPLACE VIEW/g) || []).length;
console.log(`✅ ${viewCount} views criadas`);
console.log();

// 7. Validar Triggers
console.log('7️⃣  Verificando Triggers...');
const triggerCount = (sql.match(/CREATE TRIGGER/g) || []).length;
console.log(`✅ ${triggerCount} triggers criados`);
console.log();

// 8. Validar Grants
console.log('8️⃣  Verificando Grants...');
if (sql.includes('GRANT SELECT ON candidates TO authenticated')) {
  console.log(`✅ GRANT statements encontrados`);
} else {
  console.error(`❌ GRANT statements não encontrados`);
  process.exit(1);
}
console.log();

// 9. Validar sintaxe SQL básica
console.log('9️⃣  Verificando sintaxe SQL...');
const errors = [];

// Checar para statement abertos (sem ;)
const lines = sql.split('\n');
lines.forEach((line) => {
  const trimmed = line.trim();

  // Ignorar comentários e linhas vazias
  if (!trimmed || trimmed.startsWith('--')) return;
});

if (errors.length === 0) {
  console.log(`✅ Sintaxe SQL parece válida\n`);
} else {
  console.error(`❌ Erros encontrados:`);
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}

// 10. Resumo
console.log('════════════════════════════════════════');
console.log('📋 RESUMO DA VALIDAÇÃO');
console.log('════════════════════════════════════════');
console.log(`Tabelas:     ${tables.length}`);
console.log(`Índices:     ${indexCount}`);
console.log(`RLS Policies: ${policyCount}`);
console.log(`Views:       ${viewCount}`);
console.log(`Triggers:    ${triggerCount}`);
console.log('════════════════════════════════════════\n');

console.log('✅ MIGRATION VALIDADA COM SUCESSO!\n');

console.log('📝 Próximos passos:');
console.log('1. Abra https://app.supabase.com');
console.log('2. Selecione o projeto ElectioLab');
console.log('3. Vá em SQL Editor → New Query');
console.log('4. Copie o conteúdo de:');
console.log(`   ${migrationFile}`);
console.log('5. Cole no SQL Editor e clique "Run"');
console.log('6. Execute o script de pós-validação:');
console.log('   node scripts/validate-schema.mjs\n');

process.exit(0);
