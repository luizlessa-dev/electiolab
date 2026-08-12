/**
 * Regional Aggregation Engine
 *
 * Aggregates polls across 5 regions:
 * - Sul: RS, SC, PR
 * - Sudeste: SP, RJ, MG, ES
 * - Centro-Oeste: GO, MT, MS, DF
 * - Nordeste: BA, PE, CE, RN, PB, PI, AL, SE, MA
 * - Norte: AM, RO, AC, AP, RR, TO, PA
 */

export type Region = 'sul' | 'sudeste' | 'centro-oeste' | 'nordeste' | 'norte';

export const REGIONS: Record<Region, { name: string; states: string[] }> = {
  sul: {
    name: 'Sul',
    states: ['RS', 'SC', 'PR'],
  },
  sudeste: {
    name: 'Sudeste',
    states: ['SP', 'RJ', 'MG', 'ES'],
  },
  'centro-oeste': {
    name: 'Centro-Oeste',
    states: ['GO', 'MT', 'MS', 'DF'],
  },
  nordeste: {
    name: 'Nordeste',
    states: ['BA', 'PE', 'CE', 'RN', 'PB', 'PI', 'AL', 'SE', 'MA'],
  },
  norte: {
    name: 'Norte',
    states: ['AM', 'RO', 'AC', 'AP', 'RR', 'TO', 'PA'],
  },
};

// Approximate state populations (for weighting)
const STATE_POPULATIONS: Record<string, number> = {
  SP: 46649132,
  MG: 21411923,
  RJ: 17463349,
  BA: 14985284,
  PR: 11769305,
  PE: 9616621,
  CE: 9187103,
  PA: 8777124,
  GO: 7206589,
  PB: 4067954,
  MA: 7114598,
  SC: 7252502,
  AL: 3351543,
  MT: 3567234,
  MS: 2839188,
  ES: 4018650,
  PI: 3281480,
  RN: 3534265,
  RS: 11466018,
  RO: 1777225,
  AC: 906876,
  AP: 877613,
  RR: 605761,
  TO: 1590149,
  DF: 3091113,
  SE: 2298696,
};

export interface RegionalAggregateCandidate {
  name: string
  party?: string
  percentage: number
  confidence: number
  samplesUsed: number
  statesWithData: string[]
  statesCount: number
  populationWeight: number
}

export interface RegionalAggregationResult {
  region: Region
  regionName: string
  states: string[]
  position: string
  period: number
  candidates: RegionalAggregateCandidate[]
  qualityMetrics: {
    statesCovered: number
    totalStates: number
    coverageRatio: number
    averageConfidence: number
  }
  aggregatedAt: Date
}

export class RegionalAggregation {
  /**
   * Aggregate polls for a region
   */
  aggregateRegion(
    stateResults: Array<{
      state: string
      position: string
      candidates: Array<{
        name: string
        party?: string
        percentage: number
        confidence: number
        samplesUsed: number
      }>
    }>,
    region: Region,
    position: string,
    referenceDate: Date
  ): RegionalAggregationResult {
    const regionConfig = REGIONS[region];
    const statesWithData = stateResults
      .filter(r => regionConfig.states.includes(r.state))
      .map(r => r.state);

    // Collect all unique candidates
    const candidateMap = new Map<string, RegionalAggregateCandidate>();

    for (const stateResult of stateResults.filter(r => regionConfig.states.includes(r.state))) {
      const statePopulation = STATE_POPULATIONS[stateResult.state] || 1000000;

      for (const candidate of stateResult.candidates) {
        const key = candidate.name.toLowerCase();

        if (!candidateMap.has(key)) {
          candidateMap.set(key, {
            name: candidate.name,
            party: candidate.party,
            percentage: 0,
            confidence: 0,
            samplesUsed: 0,
            statesWithData: [],
            statesCount: 0,
            populationWeight: 0,
          });
        }

        const existing = candidateMap.get(key)!;
        existing.statesWithData.push(stateResult.state);
        existing.statesCount++;
        existing.populationWeight += statePopulation;
        existing.samplesUsed += candidate.samplesUsed;
      }
    }

    // Calculate weighted percentages
    const result: RegionalAggregationResult = {
      region,
      regionName: regionConfig.name,
      states: regionConfig.states,
      position,
      period: 30,
      candidates: [],
      qualityMetrics: {
        statesCovered: statesWithData.length,
        totalStates: regionConfig.states.length,
        coverageRatio: statesWithData.length / regionConfig.states.length,
        averageConfidence: 0,
      },
      aggregatedAt: referenceDate,
    };

    // For each candidate, calculate weighted regional percentage
    for (const [, candidate] of candidateMap) {
      const stateContributions = stateResults
        .filter(r => candidate.statesWithData.includes(r.state))
        .map(r => ({
          state: r.state,
          percentage: r.candidates.find(c => c.name.toLowerCase() === candidate.name.toLowerCase())?.percentage || 0,
          population: STATE_POPULATIONS[r.state] || 1000000,
          confidence:
            r.candidates.find(c => c.name.toLowerCase() === candidate.name.toLowerCase())?.confidence || 0,
        }));

      if (stateContributions.length === 0) continue;

      // Population-weighted average
      const totalPopulation = stateContributions.reduce((sum, c) => sum + c.population, 0);
      const weightedPercentage = stateContributions.reduce(
        (sum, c) => sum + (c.percentage * c.population) / totalPopulation,
        0
      );
      const avgConfidence = stateContributions.reduce((sum, c) => sum + c.confidence, 0) / stateContributions.length;

      result.candidates.push({
        name: candidate.name,
        party: candidate.party,
        percentage: Math.round(weightedPercentage * 10) / 10,
        confidence: Math.round(avgConfidence * 100) / 100,
        samplesUsed: candidate.samplesUsed,
        statesWithData: candidate.statesWithData,
        statesCount: candidate.statesCount,
        populationWeight: Math.round((candidate.populationWeight / totalPopulation) * 10000) / 100,
      });
    }

    // Calculate quality metrics
    if (result.candidates.length > 0) {
      result.qualityMetrics.averageConfidence =
        result.candidates.reduce((sum, c) => sum + c.confidence, 0) / result.candidates.length;
    }

    // Sort by percentage descending
    result.candidates.sort((a, b) => b.percentage - a.percentage);

    return result;
  }

  /**
   * Compare regions
   */
  compareRegions(
    regionalResults: Array<{
      region: Region
      result: RegionalAggregationResult
    }>
  ): {
    regions: RegionalAggregationResult[]
    commonCandidates: string[]
    regionDifferences: Array<{
      candidate: string
      regions: Record<Region, number>
      maxDifference: number
    }>
  } {
    const commonCandidates = this.findCommonCandidates(
      regionalResults.map(r => r.result)
    );

    const regionDifferences = commonCandidates.map(candidate => {
      const percentages: Record<Region, number> = {} as any;

      for (const { region, result } of regionalResults) {
        const cand = result.candidates.find(c => c.name.toLowerCase() === candidate.toLowerCase());
        percentages[region] = cand?.percentage || 0;
      }

      const maxDiff = Math.max(...Object.values(percentages)) - Math.min(...Object.values(percentages));

      return {
        candidate,
        regions: percentages,
        maxDifference: Math.round(maxDiff * 10) / 10,
      };
    });

    // Sort by max difference
    regionDifferences.sort((a, b) => b.maxDifference - a.maxDifference);

    return {
      regions: regionalResults.map(r => r.result),
      commonCandidates,
      regionDifferences,
    };
  }

  /**
   * Get candidates present in all regions
   */
  private findCommonCandidates(results: RegionalAggregationResult[]): string[] {
    if (results.length === 0) return [];

    const firstRegionCandidates = new Set(results[0].candidates.map(c => c.name.toLowerCase()));

    for (let i = 1; i < results.length; i++) {
      const regionCandidates = new Set(results[i].candidates.map(c => c.name.toLowerCase()));
      const common = new Set([...firstRegionCandidates].filter(x => regionCandidates.has(x)));
      firstRegionCandidates.clear();
      common.forEach(c => firstRegionCandidates.add(c));
    }

    return Array.from(firstRegionCandidates);
  }

  /**
   * Get state to region mapping
   */
  static getRegionForState(state: string): Region | null {
    for (const [region, config] of Object.entries(REGIONS)) {
      if (config.states.includes(state)) {
        return region as Region;
      }
    }
    return null;
  }

  /**
   * Get all states in a region
   */
  static getStatesInRegion(region: Region): string[] {
    return REGIONS[region].states;
  }

  /**
   * Get region display name
   */
  static getRegionName(region: Region): string {
    return REGIONS[region].name;
  }
}

export const regionalAggregation = new RegionalAggregation();
