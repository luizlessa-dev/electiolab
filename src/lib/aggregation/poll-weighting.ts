/**
 * Poll Weighting & Aggregation (Wave 3b Phase 2)
 *
 * Implements three enhancement strategies:
 * A) Margin of Error weighting
 * B) Outlier detection (2σ method)
 * C) Recency weighting (14-day half-life)
 */

export interface WeightedPoll {
  candidateName: string;
  percentage: number;
  moeWeight: number;
  recencyWeight: number;
  isOutlier: boolean;
  finalWeight: number;
}

export interface AggregatedResult {
  candidateName: string;
  weightedPercentage: number;
  confidence: number;
  samplesUsed: number;
}

/**
 * A) Margin of Error Weighting
 * Higher precision (lower MoE) = higher weight
 */
export function calculateMoeWeight(marginOfError?: number): number {
  if (!marginOfError) return 0.5; // Default penalty for missing data

  if (marginOfError < 2.0) return 1.0; // Excellent precision
  if (marginOfError < 3.0) return 0.7; // Good
  return 0.3; // Poor precision, reduce weight
}

/**
 * C) Recency Weighting
 * Half-life = 14 days
 * Weight = 0.5^(days_ago / 14)
 */
export function calculateRecencyWeight(pollDate: Date, referenceDate: Date = new Date()): number {
  const daysAgo = (referenceDate.getTime() - pollDate.getTime()) / (1000 * 60 * 60 * 24);
  const halfLife = 14;
  return Math.pow(0.5, daysAgo / halfLife);
}

/**
 * B) Outlier Detection (2-Sigma Method)
 * Identifies samples > 2σ away from mean
 */
export function detectOutliers(
  candidatePercentages: number[],
  threshold: number = 2
): boolean[] {
  if (candidatePercentages.length < 2) return candidatePercentages.map(() => false);

  // Calculate mean
  const mean = candidatePercentages.reduce((a, b) => a + b, 0) / candidatePercentages.length;

  // Calculate standard deviation
  const variance =
    candidatePercentages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    candidatePercentages.length;
  const stdDev = Math.sqrt(variance);

  // Mark outliers (> threshold * σ)
  return candidatePercentages.map((val) => Math.abs(val - mean) > threshold * stdDev);
}

/**
 * Aggregate multiple polls with weighting
 */
export function aggregateWeightedPolls(
  polls: Array<{
    candidateName: string;
    percentage: number;
    marginOfError?: number;
    publishDate: Date;
  }>,
  referenceDate: Date = new Date()
): AggregatedResult[] {
  if (polls.length === 0) return [];

  // Group by candidate
  const byCandidate = new Map<string, typeof polls>();
  polls.forEach((poll) => {
    if (!byCandidate.has(poll.candidateName)) {
      byCandidate.set(poll.candidateName, []);
    }
    byCandidate.get(poll.candidateName)!.push(poll);
  });

  const results: AggregatedResult[] = [];

  for (const [candidateName, samples] of byCandidate) {
    // Step 1: Calculate weights
    const weighted = samples.map((sample) => {
      const moeWeight = calculateMoeWeight(sample.marginOfError);
      const recencyWeight = calculateRecencyWeight(sample.publishDate, referenceDate);
      return {
        percentage: sample.percentage,
        moeWeight,
        recencyWeight,
        finalWeight: moeWeight * recencyWeight,
      };
    });

    // Step 2: Detect outliers
    const percentages = weighted.map((w) => w.percentage);
    const outliers = detectOutliers(percentages);

    // Step 3: Filter valid samples (non-outliers with non-zero weight)
    const validSamples = weighted.filter(
      (w, idx) => !outliers[idx] && w.finalWeight > 0.01
    );

    if (validSamples.length === 0) continue;

    // Step 4: Calculate weighted average
    const totalWeight = validSamples.reduce((sum, s) => sum + s.finalWeight, 0);
    const weightedPercentage = validSamples.reduce(
      (sum, s) => sum + s.percentage * s.finalWeight,
      0
    ) / totalWeight;

    // Step 5: Calculate confidence (lower stdDev = higher confidence)
    const mean = weightedPercentage;
    const variance = validSamples.reduce(
      (sum, s) => sum + Math.pow(s.percentage - mean, 2) * s.finalWeight,
      0
    ) / totalWeight;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(1, 1 - stdDev / 50)); // 0-1 scale

    results.push({
      candidateName,
      weightedPercentage: Math.round(weightedPercentage * 10) / 10, // 1 decimal
      confidence: Math.round(confidence * 100) / 100, // 0-1
      samplesUsed: validSamples.length,
    });
  }

  // Sort by percentage descending
  return results.sort((a, b) => b.weightedPercentage - a.weightedPercentage);
}
