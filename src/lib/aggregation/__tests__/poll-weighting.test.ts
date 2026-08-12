import { calculateMoeWeight, calculateRecencyWeight, detectOutliers, aggregateWeightedPolls } from '../poll-weighting';

describe('Poll Weighting (Wave 3b)', () => {
  describe('A) Margin of Error Weighting', () => {
    // Continuous formula (commit 41587a3): weight = 1 / (1 + 0.4×MoE)
    it('should give high weight to excellent precision (MoE 1.5)', () => {
      expect(calculateMoeWeight(1.5)).toBeCloseTo(0.625, 3);
    });

    it('should give moderate weight to good precision (MoE 2.5)', () => {
      expect(calculateMoeWeight(2.5)).toBeCloseTo(0.5, 3);
    });

    it('should give lower weight to poor precision (MoE 3.5)', () => {
      expect(calculateMoeWeight(3.5)).toBeCloseTo(0.4167, 3);
    });

    it('should default to 0.5 for missing MoE', () => {
      expect(calculateMoeWeight(undefined)).toBe(0.5);
    });
  });

  describe('C) Recency Weighting', () => {
    it('should give weight 1.0 to today poll', () => {
      const today = new Date();
      expect(calculateRecencyWeight(today, today)).toBe(1.0);
    });

    it('should give weight ~0.5 to 14-day-old poll (half-life)', () => {
      const ref = new Date('2026-08-22');
      const old = new Date('2026-08-08');
      const weight = calculateRecencyWeight(old, ref);
      expect(weight).toBeCloseTo(0.5, 1);
    });

    it('should give weight ~0.25 to 28-day-old poll', () => {
      const ref = new Date('2026-09-05');
      const old = new Date('2026-08-08');
      const weight = calculateRecencyWeight(old, ref);
      expect(weight).toBeCloseTo(0.25, 1);
    });
  });

  describe('B) Outlier Detection (2-Sigma)', () => {
    it('should not flag normal values', () => {
      const values = [40, 42, 41, 39, 40]; // Mean ~40, tight cluster
      const outliers = detectOutliers(values);
      expect(outliers.every((o) => !o)).toBe(true);
    });

    it('should flag extreme outliers', () => {
      const values = [40, 41, 39, 40, 95]; // 95 is ~3σ away
      const outliers = detectOutliers(values);
      expect(outliers[4]).toBe(true); // Last value is outlier
    });

    it('should not flag all values as outliers', () => {
      const values = [1, 2, 3, 4, 5];
      const outliers = detectOutliers(values);
      expect(outliers.filter((o) => o).length).toBe(0);
    });
  });

  describe('Full Aggregation Pipeline', () => {
    it('should aggregate weighted polls correctly', () => {
      const polls = [
        {
          candidateName: 'Candidate A',
          percentage: 45,
          marginOfError: 2.0,
          publishDate: new Date('2026-08-08T09:00:00Z'),
        },
        {
          candidateName: 'Candidate A',
          percentage: 44,
          marginOfError: 2.5,
          publishDate: new Date('2026-08-07T09:00:00Z'), // 1 day old
        },
        {
          candidateName: 'Candidate B',
          percentage: 35,
          marginOfError: 2.2,
          publishDate: new Date('2026-08-08T09:00:00Z'),
        },
      ];

      const ref = new Date('2026-08-08T10:00:00Z');
      const results = aggregateWeightedPolls(polls, ref);

      expect(results.length).toBe(2);
      expect(results[0].candidateName).toBe('Candidate A');
      expect(results[0].weightedPercentage).toBeGreaterThan(40);
      expect(results[0].weightedPercentage).toBeLessThan(50);
      expect(results[0].confidence).toBeGreaterThan(0);
    });

    it('should handle outlier removal', () => {
      const polls = [
        {
          candidateName: 'Candidate A',
          percentage: 45,
          marginOfError: 2.0,
          publishDate: new Date('2026-08-08T09:00:00Z'),
        },
        {
          candidateName: 'Candidate A',
          percentage: 44,
          marginOfError: 2.0,
          publishDate: new Date('2026-08-08T08:00:00Z'),
        },
        {
          candidateName: 'Candidate A',
          percentage: 95, // Outlier!
          marginOfError: 2.0,
          publishDate: new Date('2026-08-08T07:00:00Z'),
        },
      ];

      const results = aggregateWeightedPolls(polls);
      expect(results[0].samplesUsed).toBe(2); // Outlier excluded
      expect(results[0].weightedPercentage).toBeLessThan(50);
    });
  });
});
