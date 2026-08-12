/**
 * State-Level Poll Aggregation (Wave 3 Phase 2)
 *
 * Aggregates polls by state with:
 * 1. Candidate validation against research data
 * 2. Weighted aggregation (MoE + Recency + Outlier detection)
 * 3. Confidence scoring based on data quality
 */

import { aggregateWeightedPolls } from './poll-weighting';
import { validateAndNormalizePollCandidates } from './candidate-validator';
import { getRealCandidatesByStateAndPosition } from '@/lib/candidates/real-candidates-2026';

export interface StatePollData {
  candidateName: string;
  percentage: number;
  marginOfError?: number;
  publishDate: Date;
  instituteName: string;
  sampleSize?: number;
}

export interface StateAggregationResult {
  state: string;
  position: 'governador' | 'senador';
  aggregatedAt: Date;
  candidates: Array<{
    name: string;
    party?: string;
    weightedPercentage: number;
    confidence: number;
    samplesUsed: number;
    researchPercentage?: number; // From research data
  }>;
  validatedPolls: number;
  invalidPolls: number;
  invalidCandidates: Array<{
    name: string;
    reason: string;
    percentage: number;
  }>;
  qualityMetrics: {
    dataQualityScore: number; // 0-1
    coverageScore: number; // % of real candidates with data
    conflictScore: number; // Variance between institutes
  };
}

/**
 * Aggregate polls for a specific state and position
 */
export function aggregateStatePolls(
  polls: StatePollData[],
  state: string,
  position: 'governador' | 'senador',
  referenceDate: Date = new Date()
): StateAggregationResult {
  const result: StateAggregationResult = {
    state,
    position,
    aggregatedAt: referenceDate,
    candidates: [],
    validatedPolls: 0,
    invalidPolls: 0,
    invalidCandidates: [],
    qualityMetrics: {
      dataQualityScore: 0,
      coverageScore: 0,
      conflictScore: 0,
    },
  };

  if (polls.length === 0) {
    return result;
  }

  // Step 1: Validate all candidates
  const pollsByCandidate = new Map<string, StatePollData[]>();
  const invalidated: Array<{ name: string; reason: string; percentage: number }> = [];

  for (const poll of polls) {
    const validation = validateAndNormalizePollCandidates(
      [{ candidateName: poll.candidateName, percentage: poll.percentage }],
      state,
      position
    );

    if (validation.valid.length > 0) {
      const validatedName = validation.valid[0].candidateName;
      if (!pollsByCandidate.has(validatedName)) {
        pollsByCandidate.set(validatedName, []);
      }
      pollsByCandidate.get(validatedName)!.push({
        ...poll,
        candidateName: validatedName,
      });
      result.validatedPolls++;
    } else {
      invalidated.push({
        name: poll.candidateName,
        reason: validation.invalid[0]?.reason || 'Unknown error',
        percentage: poll.percentage,
      });
      result.invalidPolls++;
    }
  }

  result.invalidCandidates = invalidated;

  if (result.validatedPolls === 0) {
    return result;
  }

  // Step 2: Aggregate each candidate with weighting
  const realCandidates = getRealCandidatesByStateAndPosition(state, position);
  const realCandidateMap = new Map(realCandidates.map((c) => [c.name, c]));

  const aggregatedCandidates: StateAggregationResult['candidates'] = [];

  for (const [candidateName, candidatePolls] of pollsByCandidate) {
    const pollsForAggregation = candidatePolls.map((p) => ({
      candidateName: p.candidateName,
      percentage: p.percentage,
      marginOfError: p.marginOfError,
      publishDate: p.publishDate,
    }));

    const aggregated = aggregateWeightedPolls(pollsForAggregation, referenceDate);

    // Get research data for this candidate
    const realCandidate = realCandidateMap.get(candidateName);

    if (aggregated.length > 0) {
      const agg = aggregated[0];
      aggregatedCandidates.push({
        name: candidateName,
        party: realCandidate?.party,
        weightedPercentage: agg.weightedPercentage,
        confidence: agg.confidence,
        samplesUsed: agg.samplesUsed,
        researchPercentage: realCandidate?.searchingPercentage,
      });
    }
  }

  // Step 3: Calculate quality metrics
  aggregatedCandidates.sort((a, b) => b.weightedPercentage - a.weightedPercentage);

  // Data Quality Score: based on sample coverage
  const qualityScore = Math.min(1, result.validatedPolls / Math.max(1, result.validatedPolls + result.invalidPolls));

  // Coverage Score: % of real candidates with at least one poll
  const candidatesWithData = aggregatedCandidates.length;
  const totalRealCandidates = realCandidates.length;
  const coverageScore = totalRealCandidates > 0 ? candidatesWithData / totalRealCandidates : 0;

  // Conflict Score: variance in aggregated percentages (higher = more conflict)
  let conflictScore = 0;
  if (aggregatedCandidates.length > 1) {
    const mean = aggregatedCandidates.reduce((sum, c) => sum + c.weightedPercentage, 0) / aggregatedCandidates.length;
    const variance = aggregatedCandidates.reduce(
      (sum, c) => sum + Math.pow(c.weightedPercentage - mean, 2),
      0
    ) / aggregatedCandidates.length;
    const stdDev = Math.sqrt(variance);
    // Normalize to 0-1: at 20% stddev, score = 1 (high conflict)
    conflictScore = Math.min(1, stdDev / 20);
  }

  result.candidates = aggregatedCandidates;
  result.qualityMetrics = {
    dataQualityScore: Math.round(qualityScore * 100) / 100,
    coverageScore: Math.round(coverageScore * 100) / 100,
    conflictScore: Math.round(conflictScore * 100) / 100,
  };

  return result;
}

/**
 * Compare aggregated result with research baseline
 * Identifies significant deviations between polls and research
 */
export function compareWithResearchBaseline(
  aggregation: StateAggregationResult
): Array<{
  candidateName: string;
  researchPercentage: number;
  aggregatedPercentage: number;
  deviation: number;
  isSignificant: boolean;
  confidence: number;
}> {
  return aggregation.candidates
    .filter((c) => c.researchPercentage !== undefined)
    .map((c) => ({
      candidateName: c.name,
      researchPercentage: c.researchPercentage!,
      aggregatedPercentage: c.weightedPercentage,
      deviation: c.weightedPercentage - c.researchPercentage!,
      // Significant if deviation > 5% AND confidence > 0.6
      isSignificant: Math.abs(c.weightedPercentage - c.researchPercentage!) > 5 && c.confidence > 0.6,
      confidence: c.confidence,
    }))
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
}

/**
 * Get aggregation summary for all positions in a state
 */
export async function aggregateStateComplete(
  allPolls: StatePollData[],
  state: string,
  referenceDate: Date = new Date()
): Promise<{
  state: string;
  governor: StateAggregationResult;
  senator: StateAggregationResult;
}> {
  // Separate by position (this would require poll data to include position)
  // For now, assume all polls are for the same position or split by some logic
  const governorPolls = allPolls; // In real scenario, filter by position
  const senatorPolls = allPolls;

  return {
    state,
    governor: aggregateStatePolls(governorPolls, state, 'governador', referenceDate),
    senator: aggregateStatePolls(senatorPolls, state, 'senador', referenceDate),
  };
}
