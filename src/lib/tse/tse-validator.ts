/**
 * TSE Validator - Real-time candidate validation against TSE registry
 *
 * Integrates TSE API with aggregation pipeline:
 * - Validates poll candidates against official TSE data
 * - Logs discrepancies (name, party, registration status)
 * - Enriches poll data with TSE metadata (candidate number, party)
 */

import { validateCandidate } from '@/lib/aggregation/candidate-validator';
import { fetchTSECandidatos } from './tse-client';

export interface TSEValidationResult {
  candidateName: string;
  isValid: boolean;
  tseNumber?: number;
  tseParty?: string;
  matchType: 'exact' | 'fuzzy' | 'none';
  discrepancies: string[];
  enrichedData: {
    tseNumber?: number;
    tseParty?: string;
    tseNomeUrna?: string;
  };
}

export interface BatchValidationResult {
  state: string;
  position: 'governador' | 'senador' | 'presidencial';
  totalCandidates: number;
  validatedAt: Date;
  results: TSEValidationResult[];
  summary: {
    valid: number;
    partial: number;
    invalid: number;
    discrepanciesFound: number;
  };
}

class TSEValidator {
  /**
   * Validate single candidate against TSE registry
   */
  async validateAgainstTSE(
    candidateName: string,
    state: string,
    position: 'governador' | 'senador' | 'presidencial',
    eleicaoId?: string
  ): Promise<TSEValidationResult> {
    const discrepancies: string[] = [];
    let tseNumber: number | undefined;
    let tseParty: string | undefined;
    let tseNomeUrna: string | undefined;
    let matchType: 'exact' | 'fuzzy' | 'none' = 'none';

    try {
      // First, validate against research data (skip for presidencial)
      if (position === 'presidencial') {
        return {
          candidateName,
          isValid: true,
          matchType: 'exact',
          discrepancies: [],
          enrichedData: {},
        };
      }

      const researchValidation = await validateCandidate(candidateName, state, position as 'governador' | 'senador');

      if (!researchValidation.isValid) {
        return {
          candidateName,
          isValid: false,
          matchType: 'none',
          discrepancies: [
            `Not found in research database: ${researchValidation.reason}`,
          ],
          enrichedData: {},
        };
      }

      // Get TSE candidates for the state
      // Note: In production, use eleicaoId from TSE API
      const tseCandidatos = await fetchTSECandidatos(eleicaoId || '2026', state);

      // Find matching TSE candidate
      const normalizedResearch = this.normalizeName(candidateName);
      const tseCandidato = tseCandidatos.find((tse) => {
        const normalizedTSE = this.normalizeName(tse.nomeUrna);
        return normalizedTSE === normalizedResearch;
      });

      if (tseCandidato) {
        matchType = 'exact';
        tseNumber = tseCandidato.numero;
        tseParty = tseCandidato.partido?.sigla || tseCandidato.partido?.nome;
        tseNomeUrna = tseCandidato.nomeUrna;

      } else {
        // Try fuzzy match
        const fuzzyMatch = this.fuzzyMatchCandidate(normalizedResearch, tseCandidatos);
        if (fuzzyMatch) {
          matchType = 'fuzzy';
          tseNumber = fuzzyMatch.candidate.numero;
          tseParty = fuzzyMatch.candidate.partido?.sigla;
          tseNomeUrna = fuzzyMatch.candidate.nomeUrna;

          discrepancies.push(
            `Fuzzy match required: requested="${candidateName}" vs TSE="${fuzzyMatch.candidate.nomeUrna}" (similarity: ${(fuzzyMatch.similarity * 100).toFixed(0)}%)`
          );
        }
      }

      // Check registration status
      if (!tseCandidato && !tseNumber) {
        discrepancies.push(`Candidate not found in TSE registry for ${state}`);
      }

      const isValid = matchType !== 'none';

      return {
        candidateName,
        isValid,
        tseNumber,
        tseParty,
        matchType,
        discrepancies,
        enrichedData: {
          tseNumber,
          tseParty,
          tseNomeUrna,
        },
      };
    } catch (error) {
      console.error(`Error validating ${candidateName} against TSE:`, error);
      return {
        candidateName,
        isValid: false,
        matchType: 'none',
        discrepancies: [
          `Error during TSE validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        enrichedData: {},
      };
    }
  }

  /**
   * Batch validate candidates for a state
   */
  async validateStateAgainstTSE(
    candidates: Array<{ name: string; party?: string }>,
    state: string,
    position: 'governador' | 'senador' | 'presidencial'
  ): Promise<BatchValidationResult> {
    const results: TSEValidationResult[] = [];
    let discrepanciesCount = 0;

    // Validate each candidate
    for (const candidate of candidates) {
      const result = await this.validateAgainstTSE(candidate.name, state, position);
      results.push(result);

      if (result.discrepancies.length > 0) {
        discrepanciesCount += result.discrepancies.length;
      }
    }

    const validCount = results.filter((r) => r.isValid && r.matchType === 'exact').length;
    const partialCount = results.filter((r) => r.matchType === 'fuzzy').length;
    const invalidCount = results.filter((r) => r.matchType === 'none').length;

    return {
      state,
      position,
      totalCandidates: candidates.length,
      validatedAt: new Date(),
      results,
      summary: {
        valid: validCount,
        partial: partialCount,
        invalid: invalidCount,
        discrepanciesFound: discrepanciesCount,
      },
    };
  }

  /**
   * Normalize name for comparison
   */
  private normalizeName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // Remove diacritics
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Fuzzy match candidate name
   */
  private fuzzyMatchCandidate(
    searchName: string,
    candidates: any[]
  ): { candidate: any; similarity: number } | null {
    const SIMILARITY_THRESHOLD = 0.85;

    let bestMatch: { candidate: any; similarity: number } | null = null;

    for (const candidate of candidates) {
      const similarity = this.levenshteinSimilarity(searchName, this.normalizeName(candidate.nomeUrna));

      if (similarity >= SIMILARITY_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { candidate, similarity };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Levenshtein similarity (0-1)
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Log validation results in structured format
   */
  logValidationResults(results: BatchValidationResult): void {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`TSE VALIDATION REPORT - ${results.state} (${results.position})`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`Validated at: ${results.validatedAt.toLocaleString('pt-BR')}`);
    console.log(`Total candidates: ${results.totalCandidates}`);
    console.log(`✅ Valid (exact match): ${results.summary.valid}`);
    console.log(`⚠️  Partial (fuzzy match): ${results.summary.partial}`);
    console.log(`❌ Invalid (not found): ${results.summary.invalid}`);
    console.log(`📋 Discrepancies found: ${results.summary.discrepanciesFound}\n`);

    for (const result of results.results) {
      if (result.discrepancies.length > 0) {
        console.log(`Candidate: ${result.candidateName}`);
        console.log(`  Match: ${result.matchType.toUpperCase()}`);
        if (result.tseNumber) console.log(`  TSE #: ${result.tseNumber}`);
        if (result.tseParty) console.log(`  Party: ${result.tseParty}`);

        for (const disc of result.discrepancies) {
          console.log(`  ⚠️  ${disc}`);
        }
        console.log();
      }
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }
}

export const tseValidator = new TSEValidator();
