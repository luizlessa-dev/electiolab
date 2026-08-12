/**
 * State-Level Mock Clients (Wave 3 Phase 2)
 *
 * Generates realistic poll data for all 27 states
 * Uses real candidates from research data with variation
 */

import { InstituteClientBase, Poll } from './institute-client-base';
import { getRealCandidatesByStateAndPosition } from '@/lib/candidates/real-candidates-2026';

interface MockStateClientConfig {
  instituteId: string;
  instituteName: string;
  reliabilityScore: number;
  state: string;
  baseVariation?: number; // ±% variation from research baseline
}

export class MockStateClient extends InstituteClientBase {
  private state: string;
  private baseVariation: number;

  constructor(config: MockStateClientConfig) {
    super({
      instituteId: config.instituteId,
      instituteName: config.instituteName,
      reliabilityScore: config.reliabilityScore,
      baseUrl: `https://mock-institute.local/${config.state}`,
    });
    this.state = config.state;
    this.baseVariation = config.baseVariation ?? 3; // Default ±3%
  }

  private generateMarginOfError(): number {
    // Realistic MoE between 2-3.5%
    return 2 + Math.random() * 1.5;
  }

  private generateSampleSize(): number {
    // Realistic sample sizes: 900-2500
    return 900 + Math.floor(Math.random() * 1600);
  }

  private getVariationForCandidate(basePercentage: number, rank: number): number {
    // Higher-ranked candidates have less variation
    const variation = this.baseVariation * (1 + rank * 0.1);
    return basePercentage + (Math.random() * variation * 2 - variation);
  }

  private generateGovernorPoll(): Poll {
    const candidates = getRealCandidatesByStateAndPosition(this.state, 'governador');

    // Top 3-4 candidates typically get polled
    const topCandidates = candidates.slice(0, 4);
    const moe = this.generateMarginOfError();
    const sampleSize = this.generateSampleSize();

    return this.normalizePoll({
      id: `${this.instituteId}-gov-${this.state}-${Date.now()}`,
      publishDate: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000), // Random within 14 days
      fieldworkEnd: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random within 7 days
      sampleSize,
      methodology: this.getRandomMethodology(),
      marginOfError: moe,
      results: topCandidates.map((candidate, idx) => {
        const basePercentage = candidate.searchingPercentage || (40 - idx * 10);
        return {
          candidateName: candidate.name,
          percentage: Math.max(0, this.getVariationForCandidate(basePercentage, idx)),
          candidateId: candidate.id,
        };
      }),
      sourceUrl: `https://mock-institute.local/${this.state}/governador`,
    });
  }

  private generateSenatorPoll(): Poll {
    const candidates = getRealCandidatesByStateAndPosition(this.state, 'senador');

    // Top 3-5 candidates for senate
    const topCandidates = candidates.slice(0, 5);
    const moe = this.generateMarginOfError();
    const sampleSize = this.generateSampleSize();

    return this.normalizePoll({
      id: `${this.instituteId}-sen-${this.state}-${Date.now()}`,
      publishDate: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
      fieldworkEnd: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      sampleSize,
      methodology: this.getRandomMethodology(),
      marginOfError: moe,
      results: topCandidates.map((candidate, idx) => {
        const basePercentage = candidate.searchingPercentage || (30 - idx * 5);
        return {
          candidateName: candidate.name,
          percentage: Math.max(0, this.getVariationForCandidate(basePercentage, idx)),
          candidateId: candidate.id,
        };
      }),
      sourceUrl: `https://mock-institute.local/${this.state}/senador`,
    });
  }

  private getRandomMethodology(): 'online' | 'presencial' | 'mista' {
    const methodologies: Array<'online' | 'presencial' | 'mista'> = ['online', 'presencial', 'mista'];
    return methodologies[Math.floor(Math.random() * methodologies.length)];
  }

  async fetch(): Promise<Poll[]> {
    console.log(`[${this.instituteName}] Generating mock polls for ${this.state}...`);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 300 + Math.random() * 400));

    return [
      this.generateGovernorPoll(),
      this.generateSenatorPoll(),
    ];
  }
}

/**
 * Factory function to create mock clients for all states
 */
export function createMockStateClients(): Map<string, MockStateClient> {
  const clients = new Map<string, MockStateClient>();

  const STATES = [
    // Sul
    'RS', 'SC', 'PR',
    // Sudeste
    'SP', 'RJ', 'MG', 'ES',
    // Centro-Oeste
    'GO', 'MT', 'MS', 'DF',
    // Nordeste
    'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA',
    // Norte
    'PA', 'AM', 'TO', 'AC', 'RO', 'AP', 'RR',
  ];

  const INSTITUTES = [
    { id: 'quaest', name: 'Quaest', score: 0.85 },
    { id: 'realtime', name: 'Real Time Big Data', score: 0.83 },
    { id: 'atlas', name: 'AtlasIntel', score: 0.82 },
  ];

  // Create one client per state per institute
  for (const state of STATES) {
    for (const institute of INSTITUTES) {
      const clientId = `${institute.id}-${state}`;
      clients.set(clientId, new MockStateClient({
        instituteId: clientId,
        instituteName: `${institute.name} (${state})`,
        reliabilityScore: institute.score,
        state,
        baseVariation: 2 + Math.random() * 2, // ±2-4%
      }));
    }
  }

  return clients;
}

/**
 * Create a single mock client for testing
 */
export function createMockStateClientForState(
  state: string,
  instituteName: string = 'Mock Institute'
): MockStateClient {
  return new MockStateClient({
    instituteId: `mock-${state}`,
    instituteName,
    reliabilityScore: 0.80,
    state,
  });
}

/**
 * Helper: Get mock client for specific state and institute
 */
export function getMockStateClient(
  state: string,
  instituteId: string = 'quaest'
): MockStateClient | null {
  const clients = createMockStateClients();
  return clients.get(`${instituteId}-${state}`) || null;
}
