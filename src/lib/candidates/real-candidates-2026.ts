/**
 * Candidatos Reais 2026
 *
 * APENAS candidatos que estão sendo efetivamente pesquisados por institutos como Quaest e Datafolha
 * Baseado em: Pesquisa Genial/Quaest (julho-agosto 2026)
 * Fonte: https://quaest.com.br
 *
 * Estrutura por ESTADO + CARGO (não mais suposições)
 */

export interface RealCandidate {
  id: string;
  name: string;
  party?: string;
  position?: 'presidente' | 'governador' | 'senador';
  state?: string;
  searchingPercentage?: number; // % em pesquisa mais recente
  status: 'confirmado' | 'pesquisado';
}

// ═══════════════════════════════════════════════════════════════════
// PRESIDENCIAL 2026 (Quaest/Genial - agosto 2026)
// ═══════════════════════════════════════════════════════════════════

export const REAL_PRESIDENTIAL_CANDIDATES: RealCandidate[] = [
  {
    id: 'flavio-bolsonaro',
    name: 'Flávio Bolsonaro',
    party: 'PL',
    position: 'presidente',
    searchingPercentage: 30,
    status: 'pesquisado',
  },
  {
    id: 'lula',
    name: 'Luiz Inácio Lula da Silva',
    party: 'PT',
    position: 'presidente',
    searchingPercentage: 39,
    status: 'confirmado',
  },
  {
    id: 'ronaldo-caiado',
    name: 'Ronaldo Caiado',
    party: 'UNIÃO',
    position: 'presidente',
    searchingPercentage: 4,
    status: 'pesquisado',
  },
  {
    id: 'renan-santos',
    name: 'Renan Santos',
    party: 'MISSÃO',
    position: 'presidente',
    searchingPercentage: 4,
    status: 'pesquisado',
  },
  {
    id: 'romeu-zema',
    name: 'Romeu Zema',
    party: 'NOVO',
    position: 'presidente',
    searchingPercentage: 2,
    status: 'pesquisado',
  },
];

// ═══════════════════════════════════════════════════════════════════
// RIO GRANDE DO SUL - Governador (Quaest/Genial - julho 2026)
// ═══════════════════════════════════════════════════════════════════

export const REAL_CANDIDATES_RS_GOVERNOR: RealCandidate[] = [
  {
    id: 'juliana-brizola',
    name: 'Juliana Brizola',
    party: 'PDT',
    position: 'governador',
    state: 'RS',
    searchingPercentage: 24,
    status: 'pesquisado',
  },
  {
    id: 'luciano-zucco',
    name: 'Luciano Zucco',
    party: 'PL',
    position: 'governador',
    state: 'RS',
    searchingPercentage: 22,
    status: 'pesquisado',
  },
  {
    id: 'gabriel-souza',
    name: 'Gabriel Souza',
    party: 'MDB',
    position: 'governador',
    state: 'RS',
    status: 'pesquisado',
  },
];

// ═══════════════════════════════════════════════════════════════════
// RIO GRANDE DO SUL - Senador (Quaest/Genial - julho 2026)
// ═══════════════════════════════════════════════════════════════════

export const REAL_CANDIDATES_RS_SENATOR: RealCandidate[] = [
  {
    id: 'manuela-davila',
    name: 'Manuela D\'Ávila',
    party: 'PCdoB',
    position: 'senador',
    state: 'RS',
    searchingPercentage: 12,
    status: 'pesquisado',
  },
  {
    id: 'rigotto',
    name: 'Rigotto',
    position: 'senador',
    state: 'RS',
    searchingPercentage: 9,
    status: 'pesquisado',
  },
  {
    id: 'pimenta',
    name: 'Pimenta',
    position: 'senador',
    state: 'RS',
    searchingPercentage: 9,
    status: 'pesquisado',
  },
  {
    id: 'marcel-van-hattem',
    name: 'Marcel Van Hattem',
    party: 'NOVO',
    position: 'senador',
    state: 'RS',
    searchingPercentage: 7,
    status: 'pesquisado',
  },
  {
    id: 'ubiratan-sanderson',
    name: 'Ubiratan Sanderson',
    position: 'senador',
    state: 'RS',
    searchingPercentage: 6,
    status: 'pesquisado',
  },
];

// ═══════════════════════════════════════════════════════════════════
// GOIÁS - Governador (Quaest/Genial - julho 2026)
// ═══════════════════════════════════════════════════════════════════

export const REAL_CANDIDATES_GO_GOVERNOR: RealCandidate[] = [
  {
    id: 'daniel-vilela',
    name: 'Daniel Vilela',
    party: 'MDB',
    position: 'governador',
    state: 'GO',
    searchingPercentage: 37,
    status: 'pesquisado',
  },
  {
    id: 'marconi-perillo',
    name: 'Marconi Perillo',
    party: 'UNIÃO',
    position: 'governador',
    state: 'GO',
    searchingPercentage: 21,
    status: 'pesquisado',
  },
  {
    id: 'wilder-morais',
    name: 'Wilder Morais',
    party: 'REPUBLICANOS',
    position: 'governador',
    state: 'GO',
    status: 'pesquisado',
  },
];

// ═══════════════════════════════════════════════════════════════════
// GOIÁS - Senador (Quaest/Genial - julho 2026)
// ═══════════════════════════════════════════════════════════════════

export const REAL_CANDIDATES_GO_SENATOR: RealCandidate[] = [
  {
    id: 'gracinha-caiado',
    name: 'Gracinha Caiado',
    position: 'senador',
    state: 'GO',
    searchingPercentage: 20,
    status: 'pesquisado',
  },
  {
    id: 'vanderlan-cardoso',
    name: 'Vanderlan Cardoso',
    position: 'senador',
    state: 'GO',
    searchingPercentage: 10,
    status: 'pesquisado',
  },
  {
    id: 'zacharias-calil',
    name: 'Zacharias Calil',
    position: 'senador',
    state: 'GO',
    searchingPercentage: 9,
    status: 'pesquisado',
  },
  {
    id: 'gustavo-gayer',
    name: 'Gustavo Gayer',
    position: 'senador',
    state: 'GO',
    searchingPercentage: 9,
    status: 'pesquisado',
  },
];

// ═══════════════════════════════════════════════════════════════════
// CEARÁ - Governador (Quaest/Genial - julho 2026)
// ═══════════════════════════════════════════════════════════════════

export const REAL_CANDIDATES_CE_GOVERNOR: RealCandidate[] = [
  {
    id: 'ciro-gomes',
    name: 'Ciro Gomes',
    party: 'PDT',
    position: 'governador',
    state: 'CE',
    status: 'pesquisado',
  },
  {
    id: 'elmano-de-freitas',
    name: 'Elmano de Freitas',
    party: 'PT',
    position: 'governador',
    state: 'CE',
    status: 'pesquisado',
  },
  {
    id: 'eduardo-girão',
    name: 'Eduardo Girão',
    party: 'NOVO',
    position: 'governador',
    state: 'CE',
    searchingPercentage: 3,
    status: 'pesquisado',
  },
  {
    id: 'jarir',
    name: 'Jarir',
    position: 'governador',
    state: 'CE',
    searchingPercentage: 1,
    status: 'pesquisado',
  },
];

// ═══════════════════════════════════════════════════════════════════
// CEARÁ - Senador (Quaest/Genial - julho 2026)
// ═══════════════════════════════════════════════════════════════════

export const REAL_CANDIDATES_CE_SENATOR: RealCandidate[] = [
  {
    id: 'cid-gomes',
    name: 'Cid Gomes',
    position: 'senador',
    state: 'CE',
    searchingPercentage: 22, // média de 21-24
    status: 'pesquisado',
  },
  {
    id: 'capitao-wagner',
    name: 'Capitão Wagner',
    position: 'senador',
    state: 'CE',
    searchingPercentage: 16,
    status: 'pesquisado',
  },
  {
    id: 'luizianne-lins',
    name: 'Luizianne Lins',
    position: 'senador',
    state: 'CE',
    searchingPercentage: 9,
    status: 'pesquisado',
  },
  {
    id: 'eunico-oliveira',
    name: 'Eunício Oliveira',
    position: 'senador',
    state: 'CE',
    searchingPercentage: 9,
    status: 'pesquisado',
  },
];

// ═══════════════════════════════════════════════════════════════════
// SÃO PAULO - Governador (Quaest/Genial - julho 2026)
// ═══════════════════════════════════════════════════════════════════

export const REAL_CANDIDATES_SP_GOVERNOR: RealCandidate[] = [
  {
    id: 'tarcisio-sp',
    name: 'Tarcísio de Freitas',
    party: 'REPUBLICANOS',
    position: 'governador',
    state: 'SP',
    searchingPercentage: 41,
    status: 'pesquisado',
  },
  {
    id: 'fernando-haddad',
    name: 'Fernando Haddad',
    party: 'PT',
    position: 'governador',
    state: 'SP',
    searchingPercentage: 26,
    status: 'pesquisado',
  },
  {
    id: 'vera-lucia',
    name: 'Vera Lúcia',
    position: 'governador',
    state: 'SP',
    searchingPercentage: 3,
    status: 'pesquisado',
  },
  {
    id: 'carlos-machado',
    name: 'Carlos Machado',
    position: 'governador',
    state: 'SP',
    searchingPercentage: 1,
    status: 'pesquisado',
  },
  {
    id: 'vivian-mendes',
    name: 'Vivian Mendes',
    position: 'governador',
    state: 'SP',
    searchingPercentage: 1,
    status: 'pesquisado',
  },
];

// ═══════════════════════════════════════════════════════════════════
// SÃO PAULO - Senador (Quaest/Genial - julho 2026)
// ═══════════════════════════════════════════════════════════════════

export const REAL_CANDIDATES_SP_SENATOR: RealCandidate[] = [
  {
    id: 'marina-silva-sp',
    name: 'Marina Silva',
    party: 'REDE',
    position: 'senador',
    state: 'SP',
    searchingPercentage: 14,
    status: 'pesquisado',
  },
  {
    id: 'simone-tebet-sp',
    name: 'Simone Tebet',
    party: 'MDB',
    position: 'senador',
    state: 'SP',
    searchingPercentage: 11,
    status: 'pesquisado',
  },
];

// ═══════════════════════════════════════════════════════════════════
// BAHIA - Governador (Quaest/Genial - julho 2026)
// ═══════════════════════════════════════════════════════════════════

export const REAL_CANDIDATES_BA_GOVERNOR: RealCandidate[] = [
  {
    id: 'acm-neto',
    name: 'ACM Neto',
    party: 'MDB',
    position: 'governador',
    state: 'BA',
    searchingPercentage: 39,
    status: 'pesquisado',
  },
  {
    id: 'jeronimo-rodrigues',
    name: 'Jerônimo Rodrigues',
    party: 'PT',
    position: 'governador',
    state: 'BA',
    searchingPercentage: 38,
    status: 'pesquisado',
  },
];

// ═══════════════════════════════════════════════════════════════════
// BAHIA - Senador (Quaest/Genial - julho 2026)
// ═══════════════════════════════════════════════════════════════════

export const REAL_CANDIDATES_BA_SENATOR: RealCandidate[] = [
  {
    id: 'rui-costa',
    name: 'Rui Costa',
    party: 'PT',
    position: 'senador',
    state: 'BA',
    searchingPercentage: 22,
    status: 'pesquisado',
  },
  {
    id: 'jaques-wagner',
    name: 'Jaques Wagner',
    party: 'PT',
    position: 'senador',
    state: 'BA',
    searchingPercentage: 16,
    status: 'pesquisado',
  },
];

/**
 * Get all real candidates by state and position
 */
export function getRealCandidatesByStateAndPosition(
  state: string,
  position: 'governador' | 'senador'
): RealCandidate[] {
  if (position === 'governador') {
    if (state === 'RS') return REAL_CANDIDATES_RS_GOVERNOR;
    if (state === 'GO') return REAL_CANDIDATES_GO_GOVERNOR;
    if (state === 'CE') return REAL_CANDIDATES_CE_GOVERNOR;
    if (state === 'SP') return REAL_CANDIDATES_SP_GOVERNOR;
    if (state === 'BA') return REAL_CANDIDATES_BA_GOVERNOR;
  } else if (position === 'senador') {
    if (state === 'RS') return REAL_CANDIDATES_RS_SENATOR;
    if (state === 'GO') return REAL_CANDIDATES_GO_SENATOR;
    if (state === 'CE') return REAL_CANDIDATES_CE_SENATOR;
    if (state === 'SP') return REAL_CANDIDATES_SP_SENATOR;
    if (state === 'BA') return REAL_CANDIDATES_BA_SENATOR;
  }
  return [];
}
