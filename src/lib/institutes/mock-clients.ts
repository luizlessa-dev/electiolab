/**
 * Mock Clients for Testing
 *
 * Used for Phase 1 validation when real institute websites
 * have JavaScript-heavy structures or are rate-limited.
 *
 * Replaces real scrapers during development, same interface.
 */

import { InstituteClientBase, Poll } from './institute-client-base';

export class DatafolhaMockClient extends InstituteClientBase {
  constructor() {
    super({
      instituteId: 'datafolha',
      instituteName: 'Datafolha',
      reliabilityScore: 0.92,
      baseUrl: 'https://datafolha.folha.uol.com.br',
    });
  }

  async fetch(): Promise<Poll[]> {
    console.log('[Datafolha Mock] Returning test data...');
    await new Promise(r => setTimeout(r, 500)); // Simulate network delay

    return [
      this.normalizePoll({
        id: 'df-2026-08-001',
        publishDate: new Date('2026-08-06'),
        fieldworkEnd: new Date('2026-08-05'),
        sampleSize: 2002,
        methodology: 'presencial',
        marginOfError: 2.2,
        results: [
          { candidateName: 'Candidate A', percentage: 42.5, candidateId: 'candidate-a' },
          { candidateName: 'Candidate B', percentage: 35.2, candidateId: 'candidate-b' },
          { candidateName: 'Candidate C', percentage: 18.1, candidateId: 'candidate-c' },
        ],
        sourceUrl: 'https://datafolha.folha.uol.com.br/eleicoes/2026/',
      }),
      this.normalizePoll({
        id: 'df-2026-08-002',
        publishDate: new Date('2026-08-01'),
        fieldworkEnd: new Date('2026-07-31'),
        sampleSize: 1800,
        methodology: 'presencial',
        marginOfError: 2.3,
        results: [
          { candidateName: 'Candidate A', percentage: 41.8, candidateId: 'candidate-a' },
          { candidateName: 'Candidate B', percentage: 36.1, candidateId: 'candidate-b' },
          { candidateName: 'Candidate C', percentage: 19.3, candidateId: 'candidate-c' },
        ],
        sourceUrl: 'https://datafolha.folha.uol.com.br/eleicoes/2026/',
      }),
    ];
  }
}

export class IpecMockClient extends InstituteClientBase {
  constructor() {
    super({
      instituteId: 'ipec',
      instituteName: 'Ipec',
      reliabilityScore: 0.88,
      baseUrl: 'https://ictouch.com.br',
    });
  }

  async fetch(): Promise<Poll[]> {
    console.log('[Ipec Mock] Returning test data...');
    await new Promise(r => setTimeout(r, 600));

    return [
      this.normalizePoll({
        id: 'ipec-2026-08-001',
        publishDate: new Date('2026-08-04'),
        fieldworkEnd: new Date('2026-08-03'),
        sampleSize: 1500,
        methodology: 'mista',
        marginOfError: 2.6,
        results: [
          { candidateName: 'Candidate A', percentage: 43.2, candidateId: 'candidate-a' },
          { candidateName: 'Candidate B', percentage: 34.5, candidateId: 'candidate-b' },
          { candidateName: 'Candidate C', percentage: 17.8, candidateId: 'candidate-c' },
        ],
        sourceUrl: 'https://ictouch.com.br/pesquisa',
      }),
    ];
  }
}

export class QuaestMockClient extends InstituteClientBase {
  constructor() {
    super({
      instituteId: 'quaest',
      instituteName: 'Quaest',
      reliabilityScore: 0.85,
      baseUrl: 'https://quaest.com.br',
    });
  }

  async fetch(): Promise<Poll[]> {
    console.log('[Quaest Mock] Returning test data...');
    await new Promise(r => setTimeout(r, 550));

    return [
      this.normalizePoll({
        id: 'quaest-2026-08-001',
        publishDate: new Date('2026-08-03'),
        fieldworkEnd: new Date('2026-08-02'),
        sampleSize: 1200,
        methodology: 'online',
        marginOfError: 2.8,
        results: [
          { candidateName: 'Candidate A', percentage: 40.9, candidateId: 'candidate-a' },
          { candidateName: 'Candidate B', percentage: 37.3, candidateId: 'candidate-b' },
          { candidateName: 'Candidate C', percentage: 18.2, candidateId: 'candidate-c' },
        ],
        sourceUrl: 'https://quaest.com.br/pesquisas',
      }),
    ];
  }
}

// Export singletons
export const datafolhaMockClient = new DatafolhaMockClient();
export const ipecMockClient = new IpecMockClient();
export const quaestMockClient = new QuaestMockClient();
