/**
 * Mock Clients for Testing
 *
 * Used for Phase 1 validation when real institute websites
 * have JavaScript-heavy structures or are rate-limited.
 *
 * Replaces real scrapers during development, same interface.
 */

import { InstituteClientBase, Poll } from './institute-client-base';
import { PRESIDENTIAL_CANDIDATES_2026 } from '@/lib/candidates/presidential-2026';

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
    console.log('[Datafolha Mock] Returning test data with real candidates...');
    await new Promise(r => setTimeout(r, 500)); // Simulate network delay

    const topCandidates = PRESIDENTIAL_CANDIDATES_2026.slice(0, 4);
    const percentages1 = [38.5, 28.2, 18.3, 12.1];
    const percentages2 = [37.8, 29.1, 19.2, 11.2];

    return [
      this.normalizePoll({
        id: 'df-2026-08-001',
        publishDate: new Date('2026-08-06'),
        fieldworkEnd: new Date('2026-08-05'),
        sampleSize: 2002,
        methodology: 'presencial',
        marginOfError: 2.2,
        results: topCandidates.map((candidate, idx) => ({
          candidateName: candidate.name,
          percentage: percentages1[idx],
          candidateId: candidate.id,
        })),
        sourceUrl: 'https://datafolha.folha.uol.com.br/eleicoes/2026/',
      }),
      this.normalizePoll({
        id: 'df-2026-08-002',
        publishDate: new Date('2026-08-01'),
        fieldworkEnd: new Date('2026-07-31'),
        sampleSize: 1800,
        methodology: 'presencial',
        marginOfError: 2.3,
        results: topCandidates.map((candidate, idx) => ({
          candidateName: candidate.name,
          percentage: percentages2[idx],
          candidateId: candidate.id,
        })),
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
    console.log('[Ipec Mock] Returning test data with real candidates...');
    await new Promise(r => setTimeout(r, 600));

    const topCandidates = PRESIDENTIAL_CANDIDATES_2026.slice(0, 4);
    const percentages = [39.1, 27.8, 19.2, 11.3];

    return [
      this.normalizePoll({
        id: 'ipec-2026-08-001',
        publishDate: new Date('2026-08-04'),
        fieldworkEnd: new Date('2026-08-03'),
        sampleSize: 1500,
        methodology: 'mista',
        marginOfError: 2.6,
        results: topCandidates.map((candidate, idx) => ({
          candidateName: candidate.name,
          percentage: percentages[idx],
          candidateId: candidate.id,
        })),
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
    console.log('[Quaest Mock] Returning test data with real candidates...');
    await new Promise(r => setTimeout(r, 550));

    const topCandidates = PRESIDENTIAL_CANDIDATES_2026.slice(0, 4);
    const percentages = [36.8, 30.2, 20.1, 10.4];

    return [
      this.normalizePoll({
        id: 'quaest-2026-08-001',
        publishDate: new Date('2026-08-03'),
        fieldworkEnd: new Date('2026-08-02'),
        sampleSize: 1200,
        methodology: 'online',
        marginOfError: 2.8,
        results: topCandidates.map((candidate, idx) => ({
          candidateName: candidate.name,
          percentage: percentages[idx],
          candidateId: candidate.id,
        })),
        sourceUrl: 'https://quaest.com.br/pesquisas',
      }),
    ];
  }
}

// Export singletons
export const datafolhaMockClient = new DatafolhaMockClient();
export const ipecMockClient = new IpecMockClient();
export const quaestMockClient = new QuaestMockClient();
