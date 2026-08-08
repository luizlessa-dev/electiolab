/**
 * Candidatos por Estado 2026
 *
 * Centralized access to all candidates (governors and senators) by state
 * Useful for mock clients and data generation
 */

import { getGovernorsByState, getTopGovernors } from './governors-2026';
import { getSenatorsByState, getTopSenators } from './senators-2026';
import type { StateCandidate } from './governors-2026';
import type { SenatorCandidate } from './senators-2026';

export interface StateCandidates {
  state: string;
  region: 'Sul' | 'Sudeste' | 'Centro-Oeste' | 'Nordeste' | 'Norte';
  governors: StateCandidate[];
  senators: SenatorCandidate[];
}

const REGIONS = {
  'Sul': ['RS', 'SC', 'PR'],
  'Sudeste': ['SP', 'RJ', 'MG', 'ES'],
  'Centro-Oeste': ['MT', 'MS', 'GO', 'DF'],
  'Nordeste': ['BA', 'PE', 'CE', 'RN', 'PB', 'PI', 'MA', 'AL', 'SE'],
  'Norte': ['AM', 'RO', 'AC', 'AP', 'RR', 'TO', 'PA'],
} as const;

export function getRegionByState(state: string): keyof typeof REGIONS | null {
  for (const region of Object.keys(REGIONS) as (keyof typeof REGIONS)[]) {
    if ((REGIONS[region] as readonly string[]).includes(state)) {
      return region;
    }
  }
  return null;
}

export function getCandidatesByState(state: string): StateCandidates {
  const region = getRegionByState(state);
  if (!region) {
    throw new Error(`Unknown state: ${state}`);
  }

  return {
    state,
    region,
    governors: getGovernorsByState(state),
    senators: getSenatorsByState(state),
  };
}

/**
 * Get top candidates for a state (for mock polling data generation)
 * Returns top governor and top senator candidates
 */
export function getTopCandidatesByState(
  state: string,
  governorCount: number = 3,
  senatorCount: number = 3
): {
  governors: StateCandidate[];
  senators: SenatorCandidate[];
} {
  return {
    governors: getTopGovernors(state, governorCount),
    senators: getTopSenators(state, senatorCount),
  };
}

/**
 * Get all states organized by region
 */
export function getStatesByRegion(
  region: keyof typeof REGIONS
): readonly string[] {
  return REGIONS[region];
}

/**
 * Get all regions in order
 */
export function getAllRegionsInOrder(): (keyof typeof REGIONS)[] {
  return ['Sul', 'Sudeste', 'Centro-Oeste', 'Nordeste', 'Norte'];
}

/**
 * Get all states in regional order
 */
export function getAllStatesInRegionalOrder(): string[] {
  return getAllRegionsInOrder().flatMap(region => REGIONS[region]);
}
