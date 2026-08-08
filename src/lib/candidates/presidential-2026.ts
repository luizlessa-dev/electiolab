/**
 * Candidatos Presidenciais 2026
 *
 * Baseado em:
 * - Registro de candidaturas TSE (https://www.tse.jus.br)
 * - Pesquisas de pré-candidatos
 *
 * Status: Confirmados e pré-candidatos declarados
 */

export interface Candidate {
  id: string;
  name: string;
  partyAcronym: string;
  partyName: string;
  coalition?: string;
  status: 'confirmed' | 'precandidato' | 'rumor';
}

export const PRESIDENTIAL_CANDIDATES_2026: Candidate[] = [
  // Confirmados/declarados
  {
    id: 'lula',
    name: 'Luiz Inácio Lula da Silva',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    coalition: 'Frente Popular',
    status: 'confirmed',
  },
  {
    id: 'tarcisio',
    name: 'Tarcísio de Freitas',
    partyAcronym: 'REPUBLICANOS',
    partyName: 'Republicanos',
    status: 'precandidato',
  },
  {
    id: 'ciro',
    name: 'Ciro Gomes',
    partyAcronym: 'PDT',
    partyName: 'Partido Democrático Trabalhista',
    status: 'precandidato',
  },
  {
    id: 'moro',
    name: 'Sergio Moro',
    partyAcronym: 'UNIAO',
    partyName: 'União Brasil',
    status: 'precandidato',
  },
  {
    id: 'zema',
    name: 'Romeu Zema',
    partyAcronym: 'NOVO',
    partyName: 'Partido Novo',
    status: 'precandidato',
  },
  {
    id: 'tebet',
    name: 'Simone Tebet',
    partyAcronym: 'MDB',
    partyName: 'Movimento Democrático Brasileiro',
    status: 'precandidato',
  },
  {
    id: 'marina',
    name: 'Marina Silva',
    partyAcronym: 'REDE',
    partyName: 'Rede Sustentabilidade',
    status: 'precandidato',
  },
  {
    id: 'tabata',
    name: 'Tabata Amaral',
    partyAcronym: 'PSB',
    partyName: 'Partido Socialista Brasileiro',
    status: 'precandidato',
  },
  {
    id: 'boulos',
    name: 'Guilherme Boulos',
    partyAcronym: 'PSOL',
    partyName: 'Partido Socialismo e Liberdade',
    status: 'rumor',
  },
];

export function getCandidateById(id: string): Candidate | undefined {
  return PRESIDENTIAL_CANDIDATES_2026.find((c) => c.id === id);
}

export function getCandidatesByStatus(status: Candidate['status']): Candidate[] {
  return PRESIDENTIAL_CANDIDATES_2026.filter((c) => c.status === status);
}
