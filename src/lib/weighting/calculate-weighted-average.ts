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
  instituteReliability?: number; // deprecated, use credibilityScore
  credibilityScore?: number; // 0-10 (TSE=9-10, Datafolha=9, Quaest=8, AtlasIntel=7, default=5)
  marginOfError?: number; // margin of error in percentage points (e.g., 2.5)
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
  recencyHalfLife: 14, // increased from 10 to 14 days for more stable weighting
  methodologyWeights: {
    presencial: 1.0,
    telefonica: 0.95, // updated from 0.85
    mista: 0.85, // updated from 0.75
    online: 0.9, // updated from 0.6 (online methods improved in 2026)
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

  // Phase 1: Calculate rough average to detect outliers
  let roughSum = 0;
  for (const poll of polls) {
    roughSum += poll.percentage;
  }
  const roughAverage = roughSum / polls.length;

  // Phase 2: Calculate rough std dev for outlier detection
  let roughVarianceSum = 0;
  for (const poll of polls) {
    roughVarianceSum += Math.pow(poll.percentage - roughAverage, 2);
  }
  const roughStdDev = Math.sqrt(roughVarianceSum / polls.length);

  // Phase 3: Calculate weighted average with all factors
  let weightedSum = 0;
  let totalWeight = 0;
  let totalSampleSize = 0;
  const values: { pct: number; weight: number; isOutlier: boolean }[] = [];

  for (const poll of polls) {
    // 1. Recency weight (exponential decay with 14-day half-life)
    const rWeight = recencyWeight(poll.fieldworkEnd, refDate, cfg.recencyHalfLife);

    // 2. Sample size weight (square root, normalized by 1000)
    const sWeight = Math.sqrt(poll.sampleSize / 1000);

    // 3. Methodology weight
    const mWeight = cfg.methodologyWeights[poll.methodology] ?? 0.5;

    // 4. Institute credibility weight (0-10 scale, with exponent 1.5)
    let iWeight = 1.0;
    if (cfg.useInstituteWeight) {
      const credScore = poll.credibilityScore ?? poll.instituteReliability ?? 5;
      iWeight = Math.pow(Math.max(0, Math.min(10, credScore)) / 10, 1.5);
    }

    // 5. Margin of error weight (PHASE 2)
    // Penalize polls with large margin of error
    let moeWeight = 1.0;
    if (poll.marginOfError) {
      const baselineMoE = 2.5; // typical good-quality poll MoE
      moeWeight = Math.min(1.5, baselineMoE / Math.max(0.5, poll.marginOfError));
    }

    // 6. Outlier detection weight (PHASE 2)
    // Flag and downweight values > 2σ from rough average
    const zscore = Math.abs(poll.percentage - roughAverage) / Math.max(roughStdDev, 1);
    const isOutlier = zscore > 2;
    const outlierWeight = isOutlier ? 0.5 : 1.0; // downweight outliers by 50%

    // Final weight = product of all factors
    const finalWeight = rWeight * sWeight * mWeight * iWeight * moeWeight * outlierWeight;

    weightedSum += poll.percentage * finalWeight;
    totalWeight += finalWeight;
    totalSampleSize += poll.sampleSize;
    values.push({ pct: poll.percentage, weight: finalWeight, isOutlier });
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
