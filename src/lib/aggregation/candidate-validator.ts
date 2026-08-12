/**
 * Candidate Validator
 * Validates candidates against official research data
 * Prevents poll data contamination with fictional candidates
 */

import { getRealCandidatesByStateAndPosition } from '@/lib/candidates/real-candidates-2026';

export interface ValidationResult {
  isValid: boolean;
  matchedCandidate?: string;
  reason: string;
}

/**
 * Normalize candidate names for fuzzy matching
 * Removes accents, lowercases, and trims whitespace
 */
function normalizeNameForMatching(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove diacritics
    .toLowerCase()
    .trim();
}

/**
 * Calculate string similarity (Levenshtein-inspired)
 * Returns 0-1, where 1 is perfect match
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeNameForMatching(str1);
  const normalized2 = normalizeNameForMatching(str2);

  if (normalized1 === normalized2) return 1;

  // Exact match after normalization
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.95;
  }

  // Levenshtein distance
  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 1;

  let distance = 0;
  const matrix = Array(normalized2.length + 1)
    .fill(null)
    .map(() => Array(normalized1.length + 1).fill(0));

  for (let i = 0; i <= normalized1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= normalized2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= normalized2.length; j++) {
    for (let i = 1; i <= normalized1.length; i++) {
      const indicator = normalized1[i - 1] === normalized2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  distance = matrix[normalized2.length][normalized1.length];
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Find best matching candidate from real candidates list
 * Returns candidate name if similarity >= 0.85, null otherwise
 */
function findBestMatch(
  candidateName: string,
  realCandidates: Array<{ name: string }>
): { name: string; similarity: number } | null {
  let bestMatch: { name: string; similarity: number } | null = null;

  for (const candidate of realCandidates) {
    const similarity = calculateStringSimilarity(candidateName, candidate.name);
    if (similarity > (bestMatch?.similarity ?? 0)) {
      bestMatch = { name: candidate.name, similarity };
    }
  }

  // Only accept if similarity is high enough
  if (bestMatch && bestMatch.similarity >= 0.85) {
    return bestMatch;
  }

  return null;
}

/**
 * Validate if a candidate exists in the research data for given state/position
 *
 * Returns:
 * - { isValid: true, matchedCandidate: "Name" } if found
 * - { isValid: false, reason: "error message" } if not found
 */
export function validateCandidate(
  candidateName: string,
  state: string,
  position: 'governador' | 'senador'
): ValidationResult {
  if (!candidateName || candidateName.trim().length === 0) {
    return {
      isValid: false,
      reason: 'Candidate name is empty',
    };
  }

  // Get real candidates for this state/position
  const realCandidates = getRealCandidatesByStateAndPosition(state, position);

  if (realCandidates.length === 0) {
    return {
      isValid: false,
      reason: `No research data available for ${state} ${position}`,
    };
  }

  // Try to find exact match first
  const exactMatch = realCandidates.find(
    (c) => normalizeNameForMatching(c.name) === normalizeNameForMatching(candidateName)
  );

  if (exactMatch) {
    return {
      isValid: true,
      matchedCandidate: exactMatch.name,
      reason: 'Exact match found',
    };
  }

  // Try fuzzy match
  const fuzzyMatch = findBestMatch(
    candidateName,
    realCandidates.map((c) => ({ name: c.name }))
  );

  if (fuzzyMatch) {
    return {
      isValid: true,
      matchedCandidate: fuzzyMatch.name,
      reason: `Fuzzy match (${Math.round(fuzzyMatch.similarity * 100)}% similarity)`,
    };
  }

  // No match found
  const suggestedCandidates = realCandidates
    .slice(0, 3)
    .map((c) => `"${c.name}"`)
    .join(', ');

  return {
    isValid: false,
    reason: `"${candidateName}" not found in ${state} ${position} research. Similar candidates: ${suggestedCandidates}`,
  };
}

/**
 * Validate all candidates in a poll result set
 * Returns validated candidates with any name corrections applied
 */
export function validateAndNormalizePollCandidates(
  pollResults: Array<{ candidateName: string; percentage: number }>,
  state: string,
  position: 'governador' | 'senador'
): {
  valid: Array<{ candidateName: string; percentage: number }>;
  invalid: Array<{ candidateName: string; percentage: number; reason: string }>;
} {
  const valid: Array<{ candidateName: string; percentage: number }> = [];
  const invalid: Array<{ candidateName: string; percentage: number; reason: string }> = [];

  for (const result of pollResults) {
    const validation = validateCandidate(result.candidateName, state, position);

    if (validation.isValid && validation.matchedCandidate) {
      valid.push({
        candidateName: validation.matchedCandidate, // Use official name
        percentage: result.percentage,
      });
    } else {
      invalid.push({
        ...result,
        reason: validation.reason,
      });
    }
  }

  return { valid, invalid };
}

/**
 * Get all valid candidates for a state/position with their research data
 */
export function getValidCandidatesForState(
  state: string,
  position: 'governador' | 'senador'
): Array<{
  id: string;
  name: string;
  party?: string;
  searchingPercentage?: number;
}> {
  return getRealCandidatesByStateAndPosition(state, position);
}
