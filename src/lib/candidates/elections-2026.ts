/**
 * Eleições 2026 - Structure and Mappings
 *
 * Define all elections for 2026:
 * - Presidential (national)
 * - Governors (26 states)
 * - Senators (26 states, 3 per state = 78 total)
 */

export interface Election {
  id: string;
  type: 'presidencial' | 'governador' | 'senador';
  name: string;
  state?: string; // UF for governors/senators
  candidateCount: number;
  tseId?: string;
}

// Presidential election (national)
export const ELECTION_PRESIDENTIAL_2026: Election = {
  id: 'presidencial-2026',
  type: 'presidencial',
  name: 'Eleição Presidencial 2026',
  candidateCount: 8,
  tseId: '21f8e9a3-5ff8-4baf-b0ae-6b00d2614248', // Supabase ID
};

// States for governor and senator elections
const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Governor elections (one per state)
export function getGovernorElection(uf: string): Election {
  return {
    id: `governador-${uf}-2026`,
    type: 'governador',
    name: `Eleição Governador - ${uf}`,
    state: uf,
    candidateCount: 2, // Typically 2-4 main candidates per state
    tseId: undefined,
  };
}

// Senator elections (3 per state)
export function getSenatorElections(uf: string): Election[] {
  return [
    {
      id: `senador-${uf}-1-2026`,
      type: 'senador',
      name: `Eleição Senador 1º turno - ${uf}`,
      state: uf,
      candidateCount: 3,
      tseId: undefined,
    },
    {
      id: `senador-${uf}-2-2026`,
      type: 'senador',
      name: `Eleição Senador 2º turno - ${uf}`,
      state: uf,
      candidateCount: 3,
      tseId: undefined,
    },
    {
      id: `senador-${uf}-3-2026`,
      type: 'senador',
      name: `Eleição Senador Suplência - ${uf}`,
      state: uf,
      candidateCount: 3,
      tseId: undefined,
    },
  ];
}

export function getAllStateElections(): Election[] {
  const elections: Election[] = [];

  for (const uf of UF_LIST) {
    elections.push(getGovernorElection(uf));
    elections.push(...getSenatorElections(uf));
  }

  return elections;
}

export function getAllElections(): Election[] {
  return [
    ELECTION_PRESIDENTIAL_2026,
    ...getAllStateElections(),
  ];
}
