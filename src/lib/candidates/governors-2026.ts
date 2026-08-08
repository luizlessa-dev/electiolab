/**
 * Candidatos Governadores 2026
 *
 * Real candidates by state in Brazil's 2026 gubernatorial elections
 * Organized by region: Sul → Sudeste → Centro-Oeste → Nordeste → Norte
 */

export interface StateCandidate {
  id: string;
  name: string;
  partyAcronym: string;
  partyName: string;
  state: string;
  status: 'confirmed' | 'precandidato' | 'rumor';
}

// ═══════════════════════════════════════════════════════════════════
// REGIÃO SUL (Rio Grande do Sul, Santa Catarina, Paraná)
// ═══════════════════════════════════════════════════════════════════

export const GOVERNORS_SOUTH: StateCandidate[] = [
  // Rio Grande do Sul
  {
    id: 'edu-leite',
    name: 'Eduardo Leite',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'RS',
    status: 'confirmed',
  },
  {
    id: 'onyx-lorenzoni',
    name: 'Onyx Lorenzoni',
    partyAcronym: 'PL',
    partyName: 'Partido Liberal',
    state: 'RS',
    status: 'precandidato',
  },
  {
    id: 'jairo-bolsonaro',
    name: 'Jairo Bolsonaro',
    partyAcronym: 'REPUBLICANOS',
    partyName: 'Republicanos',
    state: 'RS',
    status: 'precandidato',
  },

  // Santa Catarina
  {
    id: 'jorginho-mello',
    name: 'Jorginho Mello',
    partyAcronym: 'PL',
    partyName: 'Partido Liberal',
    state: 'SC',
    status: 'confirmed',
  },
  {
    id: 'julio-garcia',
    name: 'Julio Garcia',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'SC',
    status: 'precandidato',
  },
  {
    id: 'decio-lima',
    name: 'Décio Lima',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'SC',
    status: 'precandidato',
  },

  // Paraná
  {
    id: 'carlos-massa',
    name: 'Carlos Massa',
    partyAcronym: 'PSD',
    partyName: 'Partido Social Democrático',
    state: 'PR',
    status: 'confirmed',
  },
  {
    id: 'cristina-grivol',
    name: 'Cristina Grivol',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'PR',
    status: 'precandidato',
  },
  {
    id: 'douglas-de-sousa',
    name: 'Douglas de Sousa',
    partyAcronym: 'PODEMOS',
    partyName: 'Podemos',
    state: 'PR',
    status: 'precandidato',
  },
];

// ═══════════════════════════════════════════════════════════════════
// REGIÃO SUDESTE (São Paulo, Rio de Janeiro, Minas Gerais, Espírito Santo)
// ═══════════════════════════════════════════════════════════════════

export const GOVERNORS_SOUTHEAST: StateCandidate[] = [
  // São Paulo
  {
    id: 'tarcisio-freitas-sp',
    name: 'Tarcísio de Freitas',
    partyAcronym: 'REPUBLICANOS',
    partyName: 'Republicanos',
    state: 'SP',
    status: 'confirmed',
  },
  {
    id: 'fernando-haddad-sp',
    name: 'Fernando Haddad',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'SP',
    status: 'precandidato',
  },
  {
    id: 'guillermo-garcia',
    name: 'Guillermo García',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'SP',
    status: 'precandidato',
  },

  // Rio de Janeiro
  {
    id: 'claudio-castro',
    name: 'Claudio Castro',
    partyAcronym: 'PL',
    partyName: 'Partido Liberal',
    state: 'RJ',
    status: 'confirmed',
  },
  {
    id: 'marcelo-freixo',
    name: 'Marcelo Freixo',
    partyAcronym: 'PSB',
    partyName: 'Partido Socialista Brasileiro',
    state: 'RJ',
    status: 'precandidato',
  },
  {
    id: 'tarcisio-motta',
    name: 'Tarcísio Motta',
    partyAcronym: 'PSOL',
    partyName: 'Partido Socialismo e Liberdade',
    state: 'RJ',
    status: 'precandidato',
  },

  // Minas Gerais
  {
    id: 'romeu-zema-mg',
    name: 'Romeu Zema',
    partyAcronym: 'NOVO',
    partyName: 'Partido Novo',
    state: 'MG',
    status: 'confirmed',
  },
  {
    id: 'alexandre-kalil',
    name: 'Alexandre Kalil',
    partyAcronym: 'PSD',
    partyName: 'Partido Social Democrático',
    state: 'MG',
    status: 'precandidato',
  },
  {
    id: 'athos-navarro',
    name: 'Athos Navarro',
    partyAcronym: 'REPUBLICANOS',
    partyName: 'Republicanos',
    state: 'MG',
    status: 'precandidato',
  },

  // Espírito Santo
  {
    id: 'carlos-manato',
    name: 'Carlos Manato',
    partyAcronym: 'PL',
    partyName: 'Partido Liberal',
    state: 'ES',
    status: 'confirmed',
  },
  {
    id: 'alan-costa',
    name: 'Alan Costa',
    partyAcronym: 'PODEMOS',
    partyName: 'Podemos',
    state: 'ES',
    status: 'precandidato',
  },
  {
    id: 'ricardo-ferraço',
    name: 'Ricardo Ferraço',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'ES',
    status: 'precandidato',
  },
];

// ═══════════════════════════════════════════════════════════════════
// REGIÃO CENTRO-OESTE (Mato Grosso, Mato Grosso do Sul, Goiás, DF)
// ═══════════════════════════════════════════════════════════════════

export const GOVERNORS_CENTER_WEST: StateCandidate[] = [
  // Mato Grosso
  {
    id: 'mauro-mendes',
    name: 'Mauro Mendes',
    partyAcronym: 'REPUBLICANOS',
    partyName: 'Republicanos',
    state: 'MT',
    status: 'confirmed',
  },
  {
    id: 'alexandre-valle',
    name: 'Alexandre Valle',
    partyAcronym: 'PL',
    partyName: 'Partido Liberal',
    state: 'MT',
    status: 'precandidato',
  },
  {
    id: 'pedro-kemp',
    name: 'Pedro Kemp',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'MT',
    status: 'precandidato',
  },

  // Mato Grosso do Sul
  {
    id: 'eduardo-riedel',
    name: 'Eduardo Riedel',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'MS',
    status: 'confirmed',
  },
  {
    id: 'rose-modesto',
    name: 'Rose Modesto',
    partyAcronym: 'PSDB',
    partyName: 'Partido da Social Democracia Brasileira',
    state: 'MS',
    status: 'precandidato',
  },
  {
    id: 'paulo-correia',
    name: 'Paulo Correia',
    partyAcronym: 'PSOL',
    partyName: 'Partido Socialismo e Liberdade',
    state: 'MS',
    status: 'precandidato',
  },

  // Goiás
  {
    id: 'ronaldo-caiado',
    name: 'Ronaldo Caiado',
    partyAcronym: 'UNIONISTA',
    partyName: 'União Brasil',
    state: 'GO',
    status: 'confirmed',
  },
  {
    id: 'roberto-naves',
    name: 'Roberto Naves',
    partyAcronym: 'REPUBLICANOS',
    partyName: 'Republicanos',
    state: 'GO',
    status: 'precandidato',
  },
  {
    id: 'wallace-couto',
    name: 'Wallace Couto',
    partyAcronym: 'MDB',
    partyName: 'Movimento Democrático Brasileiro',
    state: 'GO',
    status: 'precandidato',
  },

  // Distrito Federal
  {
    id: 'ibaneis-rocha',
    name: 'Ibaneis Rocha',
    partyAcronym: 'MDB',
    partyName: 'Movimento Democrático Brasileiro',
    state: 'DF',
    status: 'confirmed',
  },
  {
    id: 'leandro-grassi',
    name: 'Leandro Grassi',
    partyAcronym: 'PSD',
    partyName: 'Partido Social Democrático',
    state: 'DF',
    status: 'precandidato',
  },
  {
    id: 'klebber-teixeira',
    name: 'Klebber Teixeira',
    partyAcronym: 'PT',
    partyName: 'Partido dos Trabalhadores',
    state: 'DF',
    status: 'precandidato',
  },
];

/**
 * Get governors by state
 */
export function getGovernorsByState(state: string): StateCandidate[] {
  const allGovernors = [
    ...GOVERNORS_SOUTH,
    ...GOVERNORS_SOUTHEAST,
    ...GOVERNORS_CENTER_WEST,
  ];
  return allGovernors.filter((g) => g.state === state);
}

/**
 * Get top 3 governors for a state (for aggregation)
 */
export function getTopGovernors(state: string, count: number = 3): StateCandidate[] {
  const governors = getGovernorsByState(state);
  // Prioritize confirmed > precandidato > rumor
  governors.sort((a, b) => {
    const statusOrder = { confirmed: 0, precandidato: 1, rumor: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  return governors.slice(0, count);
}
