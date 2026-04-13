/**
 * Institute reliability scoring.
 * Calculates Mean Absolute Error (MAE) of an institute's polls vs actual results,
 * then converts to a 0-1 reliability score.
 */

export interface PollPrediction {
  candidateId: string;
  predicted: number; // percentage from poll
  actual: number; // percentage from election result
}

/**
 * Calculate Mean Absolute Error for a set of predictions.
 */
export function calculateMAE(predictions: PollPrediction[]): number {
  if (predictions.length === 0) return 0;
  const totalError = predictions.reduce(
    (sum, p) => sum + Math.abs(p.predicted - p.actual),
    0
  );
  return totalError / predictions.length;
}

/**
 * Convert MAE to a 0-1 reliability score.
 * MAE of 0 → score 1.0 (perfect)
 * MAE of 10+ → score ~0.37 (poor)
 * Uses exponential decay: score = e^(-MAE/10)
 */
export function maeToReliabilityScore(mae: number): number {
  return Math.exp(-mae / 10);
}

/**
 * Calculate reliability score for an institute across multiple elections.
 * Takes the average MAE across elections, weighted by recency.
 */
export function calculateInstituteReliability(
  electionMAEs: { mae: number; year: number }[],
  currentYear: number = new Date().getFullYear()
): number {
  if (electionMAEs.length === 0) return 0.5; // default for unknown institutes

  let weightedSum = 0;
  let totalWeight = 0;

  for (const { mae, year } of electionMAEs) {
    const yearsOld = currentYear - year;
    const weight = Math.pow(0.8, yearsOld); // 20% decay per year
    weightedSum += mae * weight;
    totalWeight += weight;
  }

  const avgMAE = totalWeight > 0 ? weightedSum / totalWeight : 5;
  return maeToReliabilityScore(avgMAE);
}
