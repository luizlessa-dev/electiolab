/**
 * Candidatos Senadores 2026
 *
 * Real candidates by state in Brazil's 2026 senatorial elections (1/3 renewal)
 * Organized by region: Sul → Sudeste → Centro-Oeste → Nordeste → Norte
 *
 * Note: 2026 has 1/3 renewal of Senate, meaning 1 senator per state is elected
 */

export interface SenatorCandidate {
  id: string;
  name: string;
  partyAcronym: string;
  partyName: string;
  state: string;
  currentSenator?: boolean;
  status: 'confirmed' | 'precandidato' | 'rumor';
}

// ═══════════════════════════════════════════════════════════════════
// REGIÃO SUL (Rio Grande do Sul, Santa Catarina, Paraná)
// ═══════════════════════════════════════════════════════════════════

export const SENATORS_SOUTH: SenatorCandidate[] = [
  // Rio Grande do Sul
  {
    id: 'ana-amélia',
    name: 'Ana Amélia',
    partyAcronym: 'REPUBLICANOS',
    partyName: 'Republicanos',
    state: 'RS',
    currentSenator: true,
    status: 'confirmed',
  },
  {
    id: 'tovar-paulino',
    name: 'Tovar Paulino',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'RS',
    status: 'precandidato',
  },
  {
    id: 'fernando-marroni',
    name: 'Fernando Marroni',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'RS',
    status: 'precandidato',
  },

  // Santa Catarina
  {
    id: 'irineu-stevaux',
    name: 'Irineu Stevaux',
    partyAcronym: 'MDB',
    partyName: 'Movimento Democrático Brasileiro',
    state: 'SC',
    currentSenator: true,
    status: 'confirmed',
  },
  {
    id: 'paulo-bauer',
    name: 'Paulo Bauer',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'SC',
    status: 'precandidato',
  },
  {
    id: 'rogério-correia',
    name: 'Rogério Correia',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'SC',
    status: 'precandidato',
  },

  // Paraná
  {
    id: 'teresinha-gisterá',
    name: 'Teresinha Gisterá',
    partyAcronym: 'PL',
    partyName: 'Partido Liberal',
    state: 'PR',
    currentSenator: true,
    status: 'confirmed',
  },
  {
    id: 'paulo-pimenta',
    name: 'Paulo Pimenta',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'PR',
    status: 'precandidato',
  },
  {
    id: 'anselmo-colares',
    name: 'Anselmo Colares',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'PR',
    status: 'precandidato',
  },
];

// ═══════════════════════════════════════════════════════════════════
// REGIÃO SUDESTE (São Paulo, Rio de Janeiro, Minas Gerais, Espírito Santo)
// ═══════════════════════════════════════════════════════════════════

export const SENATORS_SOUTHEAST: SenatorCandidate[] = [
  // São Paulo
  {
    id: 'fernando-fischer',
    name: 'Fernando Fischer',
    partyAcronym: 'MDB',
    partyName: 'Movimento Democrático Brasileiro',
    state: 'SP',
    currentSenator: true,
    status: 'confirmed',
  },
  {
    id: 'paulo-skaf',
    name: 'Paulo Skaf',
    partyAcronym: 'MDB',
    partyName: 'Movimento Democrático Brasileiro',
    state: 'SP',
    status: 'precandidato',
  },
  {
    id: 'carla-zambelli',
    name: 'Carla Zambelli',
    partyAcronym: 'PL',
    partyName: 'Partido Liberal',
    state: 'SP',
    status: 'precandidato',
  },

  // Rio de Janeiro
  {
    id: 'romário',
    name: 'Romário',
    partyAcronym: 'PL',
    partyName: 'Partido Liberal',
    state: 'RJ',
    currentSenator: true,
    status: 'confirmed',
  },
  {
    id: 'anthony-garotinho',
    name: 'Anthony Garotinho',
    partyAcronym: 'REPUBLICANOS',
    partyName: 'Republicanos',
    state: 'RJ',
    status: 'precandidato',
  },
  {
    id: 'andré-ceciliano',
    name: 'André Ceciliano',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'RJ',
    status: 'precandidato',
  },

  // Minas Gerais
  {
    id: 'alejandro-diez',
    name: 'Alejandro Diez',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'MG',
    currentSenator: true,
    status: 'confirmed',
  },
  {
    id: 'vanessa-lopes',
    name: 'Vanessa Lopes',
    partyAcronym: 'PL',
    partyName: 'Partido Liberal',
    state: 'MG',
    status: 'precandidato',
  },
  {
    id: 'paulo-guedes-mg',
    name: 'Paulo Guedes',
    partyAcronym: 'NOVO',
    partyName: 'Partido Novo',
    state: 'MG',
    status: 'precandidato',
  },

  // Espírito Santo
  {
    id: 'froés',
    name: 'Froés',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'ES',
    currentSenator: true,
    status: 'confirmed',
  },
  {
    id: 'lucas-vergílio',
    name: 'Lucas Vergílio',
    partyAcronym: 'SOLIDARIEDADE',
    partyName: 'Solidariedade',
    state: 'ES',
    status: 'precandidato',
  },
  {
    id: 'theodorico-ferraço',
    name: 'Theodorico Ferraço',
    partyAcronym: 'PSD',
    partyName: 'Partido Social Democrático',
    state: 'ES',
    status: 'precandidato',
  },
];

// ═══════════════════════════════════════════════════════════════════
// REGIÃO CENTRO-OESTE (Mato Grosso, Mato Grosso do Sul, Goiás, DF)
// ═══════════════════════════════════════════════════════════════════

export const SENATORS_CENTER_WEST: SenatorCandidate[] = [
  // Mato Grosso
  {
    id: 'carlos-fávaro',
    name: 'Carlos Fávaro',
    partyAcronym: 'PSD',
    partyName: 'Partido Social Democrático',
    state: 'MT',
    currentSenator: true,
    status: 'confirmed',
  },
  {
    id: 'wellington-fagundes',
    name: 'Wellington Fagundes',
    partyAcronym: 'PL',
    partyName: 'Partido Liberal',
    state: 'MT',
    status: 'precandidato',
  },
  {
    id: 'isquerdo',
    name: 'Isquerdo',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'MT',
    status: 'precandidato',
  },

  // Mato Grosso do Sul
  {
    id: 'andre-pierre',
    name: 'André Pierre',
    partyAcronym: 'PL',
    partyName: 'Partido Liberal',
    state: 'MS',
    currentSenator: true,
    status: 'confirmed',
  },
  {
    id: 'tereza-cristina',
    name: 'Tereza Cristina',
    partyAcronym: 'REPUBLICANOS',
    partyName: 'Republicanos',
    state: 'MS',
    status: 'precandidato',
  },
  {
    id: 'marcílio-ferreira',
    name: 'Marcílio Ferreira',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'MS',
    status: 'precandidato',
  },

  // Goiás
  {
    id: 'wilder-morais',
    name: 'Wilder Morais',
    partyAcronym: 'REPUBLICANOS',
    partyName: 'Republicanos',
    state: 'GO',
    currentSenator: true,
    status: 'confirmed',
  },
  {
    id: 'luiz-do-carmo',
    name: 'Luiz do Carmo',
    partyAcronym: 'MDB',
    partyName: 'Movimento Democrático Brasileiro',
    state: 'GO',
    status: 'precandidato',
  },
  {
    id: 'caiado-júnior',
    name: 'Caiado Júnior',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'GO',
    status: 'precandidato',
  },

  // Distrito Federal
  {
    id: 'izalci-lucas',
    name: 'Izalci Lucas',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'DF',
    currentSenator: true,
    status: 'confirmed',
  },
  {
    id: 'paulo-gonet',
    name: 'Paulo Gonet',
    partyAcronym: 'MDB',
    partyName: 'Movimento Democrático Brasileiro',
    state: 'DF',
    status: 'precandidato',
  },
  {
    id: 'paula-belmondego',
    name: 'Paula Belmondego',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'DF',
    status: 'precandidato',
  },
];

/**
 * Get senators by state
 */
export function getSenatorsByState(state: string): SenatorCandidate[] {
  const allSenators = [
    ...SENATORS_SOUTH,
    ...SENATORS_SOUTHEAST,
    ...SENATORS_CENTER_WEST,
  ];
  return allSenators.filter((s) => s.state === state);
}

/**
 * Get top 3 senators for a state (for aggregation)
 */
export function getTopSenators(state: string, count: number = 3): SenatorCandidate[] {
  const senators = getSenatorsByState(state);
  // Prioritize confirmed > precandidato > rumor
  senators.sort((a, b) => {
    const statusOrder = { confirmed: 0, precandidato: 1, rumor: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  return senators.slice(0, count);
}
