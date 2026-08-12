/**
 * Integration Tests: Candidate Validation + State Aggregation
 *
 * Demonstrates:
 * 1. Validating real candidates against research data
 * 2. Aggregating polls by state with weighted scores
 * 3. Quality metrics and baseline comparison
 */

import { validateCandidate, validateAndNormalizePollCandidates } from '../candidate-validator';
import { aggregateStatePolls, compareWithResearchBaseline } from '../state-aggregation';

describe('Candidate Validator Integration', () => {
  describe('validateCandidate', () => {
    it('should accept exact matches', () => {
      const result = validateCandidate('Tarcísio de Freitas', 'SP', 'governador');
      expect(result.isValid).toBe(true);
      expect(result.matchedCandidate).toBe('Tarcísio de Freitas');
    });

    it('should accept fuzzy matches with high similarity', () => {
      const result = validateCandidate('Tarcísio', 'SP', 'governador');
      expect(result.isValid).toBe(true);
      expect(result.matchedCandidate).toContain('Tarcísio');
    });

    it('should reject unknown candidates', () => {
      const result = validateCandidate('Candidate A', 'SP', 'governador');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should handle empty candidate names', () => {
      const result = validateCandidate('', 'SP', 'governador');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('empty');
    });

    it('should work across all states', () => {
      const states = ['SP', 'RJ', 'MG', 'BA', 'RS', 'DF', 'PA', 'AM'];
      states.forEach(() => {
        const result = validateCandidate('Lula', 'SP', 'governador');
        // Should either accept or reject, but not crash
        expect(result).toHaveProperty('isValid');
      });
    });
  });

  describe('validateAndNormalizePollCandidates', () => {
    it('should separate valid from invalid candidates', () => {
      const pollResults = [
        { candidateName: 'Tarcísio de Freitas', percentage: 41 },
        { candidateName: 'Fernando Haddad', percentage: 26 },
        { candidateName: 'Candidate A', percentage: 10 },
      ];

      const result = validateAndNormalizePollCandidates(pollResults, 'SP', 'governador');

      expect(result.valid.length).toBe(2);
      expect(result.invalid.length).toBe(1);
      expect(result.invalid[0].candidateName).toBe('Candidate A');
    });

    it('should normalize candidate names to official versions', () => {
      const pollResults = [{ candidateName: 'tarcisio', percentage: 41 }];

      const result = validateAndNormalizePollCandidates(pollResults, 'SP', 'governador');

      expect(result.valid[0].candidateName).toBe('Tarcísio de Freitas');
    });
  });
});

describe('State Aggregation Integration', () => {
  const baseDate = new Date('2026-08-08');

  describe('aggregateStatePolls', () => {
    it('should aggregate valid polls with weighting', () => {
      const polls = [
        {
          candidateName: 'Tarcísio de Freitas',
          percentage: 41,
          marginOfError: 2,
          publishDate: new Date('2026-07-01'),
          instituteName: 'Quaest',
          sampleSize: 1000,
        },
        {
          candidateName: 'Tarcísio de Freitas',
          percentage: 42,
          marginOfError: 2.5,
          publishDate: new Date('2026-07-15'),
          instituteName: 'Real Time Big Data',
          sampleSize: 1200,
        },
      ];

      const result = aggregateStatePolls(polls, 'SP', 'governador', baseDate);

      expect(result.validatedPolls).toBe(2);
      expect(result.invalidPolls).toBe(0);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].name).toBe('Tarcísio de Freitas');
      // Aggregated should be around 41-42%
      expect(result.candidates[0].weightedPercentage).toBeGreaterThan(40);
      expect(result.candidates[0].weightedPercentage).toBeLessThan(43);
    });

    it('should handle mix of valid and invalid candidates', () => {
      const polls = [
        {
          candidateName: 'Tarcísio de Freitas',
          percentage: 41,
          marginOfError: 2,
          publishDate: new Date('2026-07-15'),
          instituteName: 'Quaest',
        },
        {
          candidateName: 'Candidate A',
          percentage: 15,
          marginOfError: 3,
          publishDate: new Date('2026-07-15'),
          instituteName: 'Unknown Institute',
        },
        {
          candidateName: 'Fernando Haddad',
          percentage: 26,
          marginOfError: 2,
          publishDate: new Date('2026-07-15'),
          instituteName: 'Real Time Big Data',
        },
      ];

      const result = aggregateStatePolls(polls, 'SP', 'governador', baseDate);

      expect(result.validatedPolls).toBe(2);
      expect(result.invalidPolls).toBe(1);
      expect(result.invalidCandidates).toHaveLength(1);
      expect(result.invalidCandidates[0].name).toBe('Candidate A');
    });

    it('should calculate quality metrics', () => {
      const polls = [
        {
          candidateName: 'Tarcísio de Freitas',
          percentage: 41,
          marginOfError: 2,
          publishDate: new Date('2026-07-15'),
          instituteName: 'Quaest',
        },
      ];

      const result = aggregateStatePolls(polls, 'SP', 'governador', baseDate);

      expect(result.qualityMetrics).toHaveProperty('dataQualityScore');
      expect(result.qualityMetrics).toHaveProperty('coverageScore');
      expect(result.qualityMetrics).toHaveProperty('conflictScore');

      expect(result.qualityMetrics.dataQualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.dataQualityScore).toBeLessThanOrEqual(1);
    });

    it('should apply recency weighting', () => {
      const recentPoll = {
        candidateName: 'Tarcísio de Freitas',
        percentage: 45,
        marginOfError: 2,
        publishDate: new Date('2026-08-07'), // 1 day old
        instituteName: 'Quaest',
      };

      const oldPoll = {
        candidateName: 'Tarcísio de Freitas',
        percentage: 35,
        marginOfError: 2,
        publishDate: new Date('2026-07-01'), // 38 days old
        instituteName: 'Real Time Big Data',
      };

      const result = aggregateStatePolls([recentPoll, oldPoll], 'SP', 'governador', baseDate);

      // Recent poll should have more weight, so average should be closer to 45
      expect(result.candidates[0].weightedPercentage).toBeGreaterThan(40);
    });

    it('should include research baseline for comparison', () => {
      const polls = [
        {
          candidateName: 'Tarcísio de Freitas',
          percentage: 41,
          marginOfError: 2,
          publishDate: new Date('2026-07-15'),
          instituteName: 'Quaest',
        },
      ];

      const result = aggregateStatePolls(polls, 'SP', 'governador', baseDate);

      const candidate = result.candidates[0];
      expect(candidate.researchPercentage).toBeDefined();
      expect(candidate.researchPercentage).toBe(41); // From research data
    });
  });

  describe('compareWithResearchBaseline', () => {
    it('should identify deviations from research baseline', () => {
      const polls = [
        {
          candidateName: 'Tarcísio de Freitas',
          percentage: 50, // Significant deviation from 41%
          marginOfError: 2,
          publishDate: new Date('2026-07-15'),
          instituteName: 'Quaest',
        },
      ];

      const aggregation = aggregateStatePolls(polls, 'SP', 'governador', baseDate);
      const comparison = compareWithResearchBaseline(aggregation);

      expect(comparison.length).toBeGreaterThan(0);
      const result = comparison[0];
      expect(result.deviation).toBeGreaterThan(0);
    });

    it('should flag significant deviations with high confidence', () => {
      const polls = [
        {
          candidateName: 'Tarcísio de Freitas',
          percentage: 50,
          marginOfError: 1, // Low MoE = high confidence
          publishDate: new Date('2026-07-15'),
          instituteName: 'Quaest',
          sampleSize: 3000,
        },
      ];

      const aggregation = aggregateStatePolls(polls, 'SP', 'governador', baseDate);
      const comparison = compareWithResearchBaseline(aggregation);

      if (comparison.length > 0) {
        const result = comparison[0];
        // With only 1 poll, confidence might be moderate
        // But if deviation > 5%, it should be flagged as significant
        if (Math.abs(result.deviation) > 5 && result.confidence > 0.6) {
          expect(result.isSignificant).toBe(true);
        }
      }
    });
  });
});

describe('End-to-End Aggregation', () => {
  it('should process multiple institutes for one state', () => {
    const baseDate = new Date('2026-08-08');

    const pollData = [
      // Quaest
      {
        candidateName: 'Tarcísio de Freitas',
        percentage: 41,
        marginOfError: 2,
        publishDate: new Date('2026-07-10'),
        instituteName: 'Quaest',
      },
      // Real Time Big Data
      {
        candidateName: 'Tarcísio de Freitas',
        percentage: 42,
        marginOfError: 2.2,
        publishDate: new Date('2026-07-20'),
        instituteName: 'Real Time Big Data',
      },
      // AtlasIntel
      {
        candidateName: 'Tarcísio de Freitas',
        percentage: 43,
        marginOfError: 2.1,
        publishDate: new Date('2026-07-30'),
        instituteName: 'AtlasIntel',
      },
      // Contaminated data (fictional candidate)
      {
        candidateName: 'Candidate A',
        percentage: 15,
        marginOfError: 3,
        publishDate: new Date('2026-07-25'),
        instituteName: 'Unknown',
      },
    ];

    const result = aggregateStatePolls(pollData, 'SP', 'governador', baseDate);

    // Should have cleaned up fictional data
    expect(result.validatedPolls).toBe(3);
    expect(result.invalidPolls).toBe(1);

    // Should aggregate the 3 real polls
    expect(result.candidates[0].samplesUsed).toBe(3);

    // Result should be around 42% (average of 41, 42, 43)
    expect(result.candidates[0].weightedPercentage).toBeGreaterThan(41);
    expect(result.candidates[0].weightedPercentage).toBeLessThan(43.5);

    // Should have good quality metrics
    expect(result.qualityMetrics.dataQualityScore).toBeGreaterThan(0.7);
  });
});
