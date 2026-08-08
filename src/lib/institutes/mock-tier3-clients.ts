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

const TIER3_INSTITUTES = [
  { id: 'ipesp', name: 'IPESP', uuid: DATAFOLHA_UUID },
  { id: 'voxpopuli', name: 'Vox Populi', uuid: IPEC_UUID },
  { id: 'dataestrategica', name: 'Data Estratégica', uuid: QUAEST_UUID },
  { id: 'agrpesquisas', name: 'AGR Pesquisas', uuid: DATAFOLHA_UUID },
  { id: 'cifrapesquisas', name: 'Cifra Pesquisas', uuid: IPEC_UUID },
  { id: 'lapop', name: 'LAPOP', uuid: QUAEST_UUID },
  { id: 'cepesp', name: 'CEPESP', uuid: DATAFOLHA_UUID },
  { id: 'ope', name: 'Observatório de Política Exterior', uuid: IPEC_UUID },
  { id: 'dataags', name: 'DataAgs', uuid: QUAEST_UUID },
  { id: 'mdainterior', name: 'MDA Interior', uuid: DATAFOLHA_UUID },
  { id: 'paranaPesquisas', name: 'Paraná Pesquisas', uuid: IPEC_UUID },
  { id: 'exitus', name: 'Exitus', uuid: QUAEST_UUID },
  { id: 'pesquisabrasil', name: 'Pesquisa Brasil', uuid: DATAFOLHA_UUID },
  { id: 'iplanario', name: 'IPLANARIO', uuid: IPEC_UUID },
  { id: 'sempla', name: 'SEMPLA', uuid: QUAEST_UUID },
  { id: 'pesquisaminas', name: 'Pesquisa Minas', uuid: DATAFOLHA_UUID },
  { id: 'bahiapesquisas', name: 'Bahia Pesquisas', uuid: IPEC_UUID },
  { id: 'pesquisapernambuco', name: 'Pesquisa Pernambuco', uuid: QUAEST_UUID },
  { id: 'opiniaobrasil', name: 'Opinião Brasil', uuid: DATAFOLHA_UUID },
  { id: 'sondagembrasil', name: 'Sondagem Brasil', uuid: IPEC_UUID },
  { id: 'consultapopular', name: 'Consulta Popular', uuid: QUAEST_UUID },
  { id: 'monitorabrasil', name: 'Monitora Brasil', uuid: DATAFOLHA_UUID },
  { id: 'pulsebrasil', name: 'Pulse Brasil', uuid: IPEC_UUID },
  { id: 'kantaribope', name: 'Kantar IBOPE', uuid: QUAEST_UUID },
  { id: 'sensus', name: 'Sensus', uuid: DATAFOLHA_UUID },
  { id: 'poderdata', name: 'Poder Data', uuid: IPEC_UUID },
  { id: 'atlas', name: 'Atlas', uuid: QUAEST_UUID },
  { id: 'infocus', name: 'InFocus', uuid: DATAFOLHA_UUID },
];

function createMockClientForInstitute(institute: typeof TIER3_INSTITUTES[0]): MockClient {
  return {
    instituteName: institute.name,
    async fetch(): Promise<Poll[]> {
      // Generate realistic results with top 4-5 candidates
      const topCandidates = PRESIDENTIAL_CANDIDATES_2026.slice(0, 5);
      const basePercentages = [36, 26, 20, 14, 4];

      const poll: Poll = {
        id: `${institute.id}-poll-1`,
        instituteId: institute.uuid,
        instituteName: institute.name,
        publishDate: new Date(),
        fieldworkEnd: new Date(Date.now() - 86400000),
        sampleSize: 2000,
        marginOfError: 2.2,
        confidenceLevel: 95,
        methodology: 'online' as const,
        results: topCandidates.map((candidate, idx) => ({
          candidateId: candidate.id,
          candidateName: candidate.name,
          percentage: basePercentages[idx] + (Math.random() * 4 - 2), // ±2% variation
        })),
        sourceUrl: `https://example.com/${institute.id}`,
        isVerified: false,
        reliabilityScore: 0.70,
      };

      console.log(`[${institute.name}] Mock returning 1 poll`);
      return [poll];
    },
  };
}

export function createMockTier3Clients(): MockClient[] {
  return TIER3_INSTITUTES.map(institute => createMockClientForInstitute(institute));
}
