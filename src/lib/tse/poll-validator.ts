/**
 * Poll Validator - Cross-check polls against TSE registry
 *
 * Ensures:
 * 1. Candidates are registered with TSE
 * 2. Poll percentages sum to ~100%
 * 3. Candidate names match official TSE names
 */

import { validateCandidateInTSE } from './tse-client';
import type { Poll } from '@/lib/institutes/institute-client-base';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  correctedCandidates: Array<{
    original: string;
    corrected: string;
  }>;
}

/**
 * Validate poll against TSE registry
 */
export async function validatePollAgainstTSE(
  poll: Poll,
  eleicaoId: string
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const correctedCandidates: Array<{ original: string; corrected: string }> = [];

  // Check 1: Sum of percentages ~100%
  const totalPercentage = poll.results.reduce((sum, r) => sum + r.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 5) {
    warnings.push(
      `Percentuais somam ${totalPercentage.toFixed(1)}%, esperado ~100%`
    );
  }

  // Check 2: Validate each candidate against TSE
  for (const result of poll.results) {
    const tseCandidate = await validateCandidateInTSE(
      result.candidateName,
      eleicaoId,
      poll.sourceUrl?.includes('estado') ? extractUF(poll.sourceUrl) : undefined
    );

    if (!tseCandidate) {
      warnings.push(`Candidato "${result.candidateName}" não encontrado no TSE`);
    } else if (tseCandidate.nomeUrna !== result.candidateName) {
      correctedCandidates.push({
        original: result.candidateName,
        corrected: tseCandidate.nomeUrna,
      });
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    correctedCandidates,
  };
}

/**
 * Extract UF from source URL if possible
 */
function extractUF(url: string): string | undefined {
  const match = url.match(/[_-](SP|RJ|MG|BA|RS|PE|CE|PA|SC|GO|PB|MA|ES|PI|RN|AL|MT|MS|DF|AC|AM|AP|RO|RR|TO)([_/-]|$)/i);
  return match ? match[1].toUpperCase() : undefined;
}

/**
 * Flag suspicious polls for manual review
 */
export function flagSuspiciousPoll(
  poll: Poll,
  validation: ValidationResult
): boolean {
  // Flag if:
  // 1. Multiple validation warnings
  // 2. Margin of error unusually high (> 5%)
  // 3. Candidates don't match TSE

  const suspiciousScore =
    validation.warnings.length * 2 +
    (poll.marginOfError && poll.marginOfError > 5 ? 1 : 0) +
    validation.correctedCandidates.length;

  return suspiciousScore >= 2;
}
