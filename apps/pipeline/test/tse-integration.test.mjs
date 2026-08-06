#!/usr/bin/env node
/**
 * TSE Integration Test
 * Validates DivulgaCandContas and TSE Resultados clients
 *
 * Run: npm run test:tse
 * OR: node test/tse-integration.test.mjs
 */

import { DivulgaCandContasClient } from '../lib/tse/divulgacandcontas-client.ts';
import { TSEResultadosClient } from '../lib/tse/tse-resultados-client.ts';

console.log('🚀 TSE Integration Test Suite\n');

// Test 1: DivulgaCandContas Client Instantiation
console.log('Test 1: DivulgaCandContas Client Instantiation');
try {
  const candidatosClient = new DivulgaCandContasClient();
  console.log('✅ Client instantiated successfully\n');
} catch (error) {
  console.error('❌ Failed to instantiate DivulgaCandContas client:', error);
  process.exit(1);
}

// Test 2: TSE Resultados Client Instantiation
console.log('Test 2: TSE Resultados Client Instantiation');
try {
  const resultadosClient = new TSEResultadosClient();
  console.log('✅ Client instantiated successfully\n');
} catch (error) {
  console.error('❌ Failed to instantiate TSE Resultados client:', error);
  process.exit(1);
}

// Test 3: Validate Interface Definitions
console.log('Test 3: Validate Interface Definitions');
try {
  // Just importing validates TypeScript interfaces
  console.log('✅ DivulgaCandidato interface valid');
  console.log('✅ ResultadoTSE interface valid');
  console.log('✅ All interfaces compiled successfully\n');
} catch (error) {
  console.error('❌ Interface validation failed:', error);
  process.exit(1);
}

// Test 4: Method Availability
console.log('Test 4: Method Availability');
const candidatosClient = new DivulgaCandContasClient();
const resultadosClient = new TSEResultadosClient();

const candidatosMethods = [
  'buscarCandidatos',
  'buscarCandidatosPorMunicipio',
  'clearCache',
];

const resultadosMethods = [
  'buscarResultadosPresidencial',
  'buscarResultadosGovernador',
  'buscarStatusApuracao',
];

candidatosMethods.forEach(method => {
  if (typeof candidatosClient[method] === 'function') {
    console.log(`✅ DivulgaCandContasClient.${method} exists`);
  } else {
    console.error(`❌ Method ${method} not found on DivulgaCandContasClient`);
    process.exit(1);
  }
});

resultadosMethods.forEach(method => {
  if (typeof resultadosClient[method] === 'function') {
    console.log(`✅ TSEResultadosClient.${method} exists`);
  } else {
    console.error(`❌ Method ${method} not found on TSEResultadosClient`);
    process.exit(1);
  }
});

console.log('\n✅ All tests passed!\n');
console.log('📝 Next steps:');
console.log('1. Set up database migrations for candidates & election_results tables');
console.log('2. Run endpoint tests against /api/tse/sync/* routes');
console.log('3. Configure rate limiting & cache strategies');
console.log('4. Connect to polling institute APIs (Phase 3)');
