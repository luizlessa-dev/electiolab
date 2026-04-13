/**
 * Recency decay — exponential half-life weighting.
 * More recent polls get higher weight; older polls decay toward zero.
 */

export function recencyWeight(
  fieldworkEndDate: Date,
  referenceDate: Date = new Date(),
  halfLifeDays: number = 10
): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOld =
    (referenceDate.getTime() - fieldworkEndDate.getTime()) / msPerDay;

  if (daysOld < 0) return 1; // future date treated as most recent
  return Math.pow(0.5, daysOld / halfLifeDays);
}
