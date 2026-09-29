import { simulateDeputyIntention } from '../src/lib/simulador-deputado';

const presData = [
  { candidate: 'Lula', percentage: 38, candidate_slug: 'lula', fieldwork_end: '2026-09-20' },
  { candidate: 'Bolsonaro', percentage: 35, candidate_slug: 'bolsonaro', fieldwork_end: '2026-09-20' }
];

const estimates = simulateDeputyIntention(presData, 'SP');
console.log('Estimates for SP:');
estimates.forEach(e => console.log(`  ${e.coalition}: ${e.percentage.toFixed(1)}%`));
