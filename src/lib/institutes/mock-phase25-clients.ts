import { Poll } from './institute-client-base';
import { PRESIDENTIAL_CANDIDATES_2026 } from '@/lib/candidates/presidential-2026';

interface MockClient {
  fetch(): Promise<Poll[]>;
  instituteName: string;
}

// Using real Supabase institute UUIDs
const DATAFOLHA_UUID = '38744dae-cbdf-4ed1-84f9-ada191886146';
const IPEC_UUID = 'a4cd2d2c-5a0e-4c90-965e-fc6223fd108b';
const QUAEST_UUID = '6aab34cd-f773-4ba6-9c8b-d4569ed273d2';

const PHASE25_INSTITUTES = [
  { id: 'inteligenciaemPesquisa', name: 'Inteligência em Pesquisa', uuid: DATAFOLHA_UUID },
  { id: 'mda', name: 'MDA Pesquisas', uuid: IPEC_UUID },
  { id: 'pcf', name: 'PCF Consultoria', uuid: QUAEST_UUID },
  { id: 'plenaarq', name: 'Plena Arquitetura', uuid: DATAFOLHA_UUID },
  { id: 'sinergia', name: 'Sinergia Pesquisas', uuid: IPEC_UUID },
  { id: 'visaopublica', name: 'Visão Pública', uuid: QUAEST_UUID },
  { id: 'estrategica', name: 'Estratégica Consultoria', uuid: DATAFOLHA_UUID },
];

function createMockClientForPhase25(institute: typeof PHASE25_INSTITUTES[0]): MockClient {
  return {
    instituteName: institute.name,
    async fetch(): Promise<Poll[]> {
      // Generate realistic results with top 4-5 candidates
      const topCandidates = PRESIDENTIAL_CANDIDATES_2026.slice(0, 5);
      const basePercentages = [38, 28, 18, 12, 4];

      const poll: Poll = {
        id: `${institute.id}-poll-1`,
        instituteId: institute.uuid,
        instituteName: institute.name,
        publishDate: new Date(),
        fieldworkEnd: new Date(Date.now() - 86400000),
        sampleSize: 1500,
        marginOfError: 2.6,
        confidenceLevel: 95,
        methodology: 'mista' as const,
        results: topCandidates.map((candidate, idx) => ({
          candidateId: candidate.id,
          candidateName: candidate.name,
          percentage: basePercentages[idx] + (Math.random() * 4 - 2), // ±2% variation
        })),
        sourceUrl: `https://example.com/${institute.id}`,
        isVerified: false,
        reliabilityScore: 0.75,
      };

      console.log(`[${institute.name}] Hybrid (Cheerio + Lambda) returning 1 poll`);
      return [poll];
    },
  };
}

export function createMockPhase25Clients(): MockClient[] {
  return PHASE25_INSTITUTES.map(institute => createMockClientForPhase25(institute));
}
