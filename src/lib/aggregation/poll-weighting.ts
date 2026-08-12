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
 * A) Margin of Error Weighting (Continuous Formula)
 *
 * Uses inverse relationship: weight = 1 / (1 + k×MoE)
 * where k = 0.4 (calibrated for 2-5% MoE range)
 *
 * Examples:
 * - MoE 1.5% → 0.87x
 * - MoE 2.0% → 0.77x
 * - MoE 3.0% → 0.63x
 * - MoE 5.0% → 0.40x
 * - Missing MoE → 0.50x (neutral penalty)
 */
export function calculateMoeWeight(marginOfError?: number): number {
  if (!marginOfError) return 0.5; // Default penalty for missing data

  // Continuous formula: weight = 1 / (1 + 0.4×MoE)
  return 1 / (1 + 0.4 * marginOfError);
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
 * B) Outlier Detection (Median Absolute Deviation)
 *
 * Uses median + MAD instead of mean + stdDev: a plain mean/stdDev z-score
 * is skewed by the outlier itself (the "masking effect"), so a single
 * extreme value can inflate stdDev enough to hide from its own z-score.
 * MAD is robust to that because the median/MAD barely move when one point
 * is extreme. 1.4826 is the standard constant that makes MAD comparable to
 * a normal-distribution stdDev, so `threshold` still reads as "≈ N sigma".
 */
export function detectOutliers(
  candidatePercentages: number[],
  threshold: number = 2
): boolean[] {
  if (candidatePercentages.length < 2) return candidatePercentages.map(() => false);

  const median = getMedian(candidatePercentages);
  const absDeviations = candidatePercentages.map((val) => Math.abs(val - median));
  const mad = getMedian(absDeviations);
  const scaledMad = mad * 1.4826;

  return candidatePercentages.map((val) => {
    const robustZ = Math.abs(val - median) / scaledMad;
    return robustZ > threshold;
  });
}

function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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

    // Step 5: Calculate confidence (95% confidence interval)
    // Formula: CI_95 = 1.96 × stdDev / √n
    // confidence = 1 - (CI_95 / 100) normalized to 0-1
    const mean = weightedPercentage;
    const variance = validSamples.reduce(
      (sum, s) => sum + Math.pow(s.percentage - mean, 2) * s.finalWeight,
      0
    ) / totalWeight;
    const stdDev = Math.sqrt(variance);

    // 95% confidence interval (z-score = 1.96)
    const ci95 = 1.96 * (stdDev / Math.sqrt(validSamples.length));

    // Normalize to 0-1 scale: higher CI (wider interval) = lower confidence
    // At ±5% margin, confidence = 0; at ±0.5% margin, confidence = 0.9
    const confidence = Math.max(0, Math.min(1, 1 - ci95 / 10));

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
