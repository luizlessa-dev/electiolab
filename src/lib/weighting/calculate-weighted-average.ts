/**
 * Core weighted average calculation for electoral polls.
 * Combines 4 weight factors: recency, sample size, methodology, institute reliability.
 */

import { recencyWeight } from "./recency-decay";

export interface PollInput {
  id: string;
  fieldworkEnd: Date;
  sampleSize: number;
  methodology: "presencial" | "telefonica" | "online" | "mista";
  instituteReliability: number; // 0-1
  percentage: number; // candidate's percentage in this poll
}

export interface WeightConfig {
  recencyHalfLife: number;
  methodologyWeights: Record<string, number>;
  useInstituteWeight: boolean;
  referenceDate?: Date;
}

export interface WeightedResult {
  average: number;
  confidenceLow: number;
  confidenceHigh: number;
  pollCount: number;
  totalSampleSize: number;
}

const DEFAULT_CONFIG: WeightConfig = {
  recencyHalfLife: 10,
  methodologyWeights: {
    presencial: 1.0,
    telefonica: 0.85,
    mista: 0.75,
    online: 0.6,
  },
  useInstituteWeight: true,
};

export function calculateWeightedAverage(
  polls: PollInput[],
  config: Partial<WeightConfig> = {}
): WeightedResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const refDate = cfg.referenceDate || new Date();

  if (polls.length === 0) {
    return {
      average: 0,
      confidenceLow: 0,
      confidenceHigh: 0,
      pollCount: 0,
      totalSampleSize: 0,
    };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  let totalSampleSize = 0;
  const values: { pct: number; weight: number }[] = [];

  for (const poll of polls) {
    // 1. Recency weight (exponential decay)
    const rWeight = recencyWeight(poll.fieldworkEnd, refDate, cfg.recencyHalfLife);

    // 2. Sample size weight (square root, normalized by 1000)
    const sWeight = Math.sqrt(poll.sampleSize / 1000);

    // 3. Methodology weight
    const mWeight = cfg.methodologyWeights[poll.methodology] ?? 0.5;

    // 4. Institute reliability weight
    const iWeight = cfg.useInstituteWeight ? poll.instituteReliability : 1.0;

    // Final weight = product of all factors
    const finalWeight = rWeight * sWeight * mWeight * iWeight;

    weightedSum += poll.percentage * finalWeight;
    totalWeight += finalWeight;
    totalSampleSize += poll.sampleSize;
    values.push({ pct: poll.percentage, weight: finalWeight });
  }

  if (totalWeight === 0) {
    return {
      average: 0,
      confidenceLow: 0,
      confidenceHigh: 0,
      pollCount: polls.length,
      totalSampleSize,
    };
  }

  const average = weightedSum / totalWeight;

  // Weighted standard deviation for confidence interval
  let varianceSum = 0;
  for (const v of values) {
    varianceSum += v.weight * Math.pow(v.pct - average, 2);
  }
  const weightedStdDev = Math.sqrt(varianceSum / totalWeight);

  const confidenceLow = Math.max(0, average - 1.96 * weightedStdDev);
  const confidenceHigh = Math.min(100, average + 1.96 * weightedStdDev);

  return {
    average: Math.round(average * 10) / 10,
    confidenceLow: Math.round(confidenceLow * 10) / 10,
    confidenceHigh: Math.round(confidenceHigh * 10) / 10,
    pollCount: polls.length,
    totalSampleSize,
  };
}

/**
 * Calculate weighted averages for all candidates in an election.
 */
export function calculateAllCandidates(
  candidateIds: string[],
  pollsByCandidateId: Map<string, PollInput[]>,
  config?: Partial<WeightConfig>
): Map<string, WeightedResult> {
  const results = new Map<string, WeightedResult>();

  for (const candidateId of candidateIds) {
    const polls = pollsByCandidateId.get(candidateId) || [];
    results.set(candidateId, calculateWeightedAverage(polls, config));
  }

  return results;
}
