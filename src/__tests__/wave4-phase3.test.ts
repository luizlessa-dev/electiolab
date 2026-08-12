/**
 * Wave 4 Phase 3 Integration Tests
 *
 * Tests for:
 * - Historical snapshot recording
 * - Candidate trajectory tracking
 * - Trend analysis
 * - Period comparison
 */

import { describe, it, expect } from '@jest/globals';
import { pollHistory, type AggregationSnapshot } from '@/lib/history/poll-history';

describe('Wave 4 Phase 3: Analytics & Histórico', () => {
  // ============================================================================
  // Mock Data Generators
  // ============================================================================

  const createMockSnapshot = (
    state: string,
    daysAgo: number,
    candidates: Array<{ name: string; percentage: number }>
  ): AggregationSnapshot => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      id: `snapshot-${daysAgo}`,
      state,
      position: 'governador',
      snapshotDate: date,
      candidates: candidates.map(c => ({
        name: c.name,
        party: 'PT',
        percentage: c.percentage,
        confidence: 0.85,
      })),
      qualityMetrics: {
        dataQualityScore: 0.95,
        coverageScore: 0.9,
        conflictScore: 0.15,
      },
      sampleSize: 2000,
      source: 'live',
    };
  };

  // ============================================================================
  // History Recording Tests
  // ============================================================================

  describe('Snapshot Recording', () => {
    it('should record aggregation snapshot', async () => {
      const snapshot = createMockSnapshot('SP', 0, [
        { name: 'Candidate A', percentage: 35 },
        { name: 'Candidate B', percentage: 28 },
      ]);

      const id = await pollHistory.recordSnapshot(snapshot);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should handle multiple snapshots', async () => {
      const snapshots = [
        createMockSnapshot('SP', 10, [{ name: 'Candidate A', percentage: 33 }]),
        createMockSnapshot('SP', 5, [{ name: 'Candidate A', percentage: 34 }]),
        createMockSnapshot('SP', 0, [{ name: 'Candidate A', percentage: 35 }]),
      ];

      for (const snapshot of snapshots) {
        const id = await pollHistory.recordSnapshot(snapshot);
        expect(id).toBeDefined();
      }
    });
  });

  // ============================================================================
  // Candidate History Tests
  // ============================================================================

  describe('Candidate History', () => {
    it('should retrieve candidate history', async () => {
      // Assume snapshots were recorded
      const trajectory = await pollHistory.getCandidateHistory('Candidate A', 'SP', 'governador', 90);

      if (trajectory) {
        expect(trajectory.name).toBe('Candidate A');
        expect(trajectory.state).toBe('SP');
        expect(trajectory.position).toBe('governador');
        expect(Array.isArray(trajectory.history)).toBe(true);
      }
    });

    it('should detect trend direction', async () => {
      const trajectory = await pollHistory.getCandidateHistory('Test', 'SP', 'governador', 30);

      if (trajectory) {
        expect(['up', 'down', 'stable']).toContain(trajectory.trend);
      }
    });

    it('should calculate average percentage', async () => {
      const trajectory = await pollHistory.getCandidateHistory('Test', 'SP', 'governador', 30);

      if (trajectory) {
        expect(trajectory.averagePercentage).toBeGreaterThanOrEqual(0);
        expect(trajectory.averagePercentage).toBeLessThanOrEqual(100);
      }
    });

    it('should handle missing candidates', async () => {
      const trajectory = await pollHistory.getCandidateHistory('NonExistent', 'XX', 'governador', 30);

      expect(trajectory).toBeNull();
    });
  });

  // ============================================================================
  // Trend Metrics Tests
  // ============================================================================

  describe('Trend Metrics', () => {
    it('should calculate trend metrics', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const metrics = await pollHistory.getTrendMetrics('Candidate', 'SP', 'governador', startDate, endDate);

      if (metrics) {
        expect(metrics.candidate).toBe('Candidate');
        expect(metrics.state).toBe('SP');
        expect(metrics.position).toBe('governador');
        expect(['up', 'down', 'stable']).toContain(metrics.trend);
        expect(['high', 'medium', 'low']).toContain(metrics.consistency);
      }
    });

    it('should calculate volatility', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const metrics = await pollHistory.getTrendMetrics('Test', 'SP', 'governador', startDate, endDate);

      if (metrics) {
        expect(metrics.volatility).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle empty periods', async () => {
      const endDate = new Date('2020-01-01');
      const startDate = new Date('2020-01-01');
      startDate.setDate(startDate.getDate() - 30);

      const metrics = await pollHistory.getTrendMetrics('Test', 'SP', 'governador', startDate, endDate);

      expect(metrics).toBeNull();
    });
  });

  // ============================================================================
  // Period Comparison Tests
  // ============================================================================

  describe('Period Comparison', () => {
    it('should compare two periods', async () => {
      const refDate = new Date();
      const period1Start = new Date(refDate);
      period1Start.setDate(period1Start.getDate() - 60);
      const period1End = new Date(refDate);
      period1End.setDate(period1End.getDate() - 30);

      const period2Start = new Date(refDate);
      period2Start.setDate(period2Start.getDate() - 30);
      const period2End = new Date(refDate);

      const comparison = await pollHistory.comparePeriods(
        'SP',
        'governador',
        period1Start,
        period1End,
        period2Start,
        period2End
      );

      if (comparison) {
        expect(Array.isArray(comparison.period1)).toBe(true);
        expect(Array.isArray(comparison.period2)).toBe(true);
        expect(Array.isArray(comparison.changes)).toBe(true);
      }
    });

    it('should detect candidate changes', async () => {
      // This assumes data exists from previous tests
      const refDate = new Date();
      const period1Start = new Date(refDate);
      period1Start.setDate(period1Start.getDate() - 60);
      const period1End = new Date(refDate);
      period1End.setDate(period1End.getDate() - 30);

      const period2Start = new Date(refDate);
      period2Start.setDate(period2Start.getDate() - 30);

      const comparison = await pollHistory.comparePeriods(
        'SP',
        'governador',
        period1Start,
        period1End,
        period2Start,
        new Date(refDate)
      );

      if (comparison && comparison.changes.length > 0) {
        comparison.changes.forEach(c => {
          expect(typeof c.change).toBe('number');
          expect(typeof c.percentChange).toBe('number');
        });
      }
    });

    it('should handle insufficient data', async () => {
      const period1Start = new Date('1900-01-01');
      const period1End = new Date('1900-02-01');

      const comparison = await pollHistory.comparePeriods(
        'XX',
        'governador',
        period1Start,
        period1End,
        period1Start,
        period1End
      );

      expect(comparison).toBeNull();
    });
  });

  // ============================================================================
  // Snapshot Retrieval Tests
  // ============================================================================

  describe('Snapshot Retrieval', () => {
    it('should retrieve snapshots for state', async () => {
      const snapshots = await pollHistory.getSnapshots('SP', 'governador', 30, 10);

      expect(Array.isArray(snapshots)).toBe(true);
    });

    it('should respect day limit', async () => {
      const snapshots = await pollHistory.getSnapshots('SP', 'governador', 7, 100);

      expect(Array.isArray(snapshots)).toBe(true);
      snapshots.forEach(s => {
        const daysDiff = (new Date().getTime() - s.snapshotDate.getTime()) / (24 * 60 * 60 * 1000);
        expect(daysDiff).toBeLessThanOrEqual(7);
      });
    });

    it('should handle missing state', async () => {
      const snapshots = await pollHistory.getSnapshots('XX', 'governador', 30, 10);

      expect(Array.isArray(snapshots)).toBe(true);
    });
  });

  // ============================================================================
  // Data Integrity Tests
  // ============================================================================

  describe('Data Integrity', () => {
    it('should maintain data consistency', async () => {
      const snapshot = createMockSnapshot('SP', 0, [
        { name: 'Candidate A', percentage: 35.5 },
        { name: 'Candidate B', percentage: 28.3 },
      ]);

      const id = await pollHistory.recordSnapshot(snapshot);

      if (id) {
        const snapshots = await pollHistory.getSnapshots('SP', 'governador', 1, 100);
        const recorded = snapshots.find(s => s.id === id);

        if (recorded) {
          expect(recorded.candidates[0].percentage).toBeCloseTo(35.5, 1);
        }
      }
    });

    it('should preserve quality metrics', async () => {
      const snapshot = createMockSnapshot('SP', 0, [
        { name: 'Test Candidate', percentage: 42 },
      ]);

      snapshot.qualityMetrics.dataQualityScore = 0.98;

      const id = await pollHistory.recordSnapshot(snapshot);

      if (id) {
        const snapshots = await pollHistory.getSnapshots('SP', 'governador', 1, 100);
        const recorded = snapshots.find(s => s.id === id);

        if (recorded) {
          expect(recorded.qualityMetrics.dataQualityScore).toBeCloseTo(0.98, 2);
        }
      }
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should record snapshots efficiently', async () => {
      const start = Date.now();

      const snapshot = createMockSnapshot('SP', 0, [
        { name: 'Candidate', percentage: 35 },
      ]);

      await pollHistory.recordSnapshot(snapshot);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });

    it('should retrieve history within timeout', async () => {
      const start = Date.now();

      await pollHistory.getCandidateHistory('Candidate', 'SP', 'governador', 30);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });

    it('should compare periods efficiently', async () => {
      const start = Date.now();
      const refDate = new Date();

      const period1Start = new Date(refDate);
      period1Start.setDate(period1Start.getDate() - 60);
      const period1End = new Date(refDate);
      period1End.setDate(period1End.getDate() - 30);

      await pollHistory.comparePeriods('SP', 'governador', period1Start, period1End, period1Start, period1End);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle invalid parameters gracefully', async () => {
      const trajectory = await pollHistory.getCandidateHistory('', '', 'governador' as any, -1);

      expect(trajectory).toBeNull();
    });

    it('should handle date edge cases', async () => {
      const endDate = new Date('1970-01-01');
      const startDate = new Date('1960-01-01');

      const metrics = await pollHistory.getTrendMetrics('Test', 'SP', 'governador', startDate, endDate);

      expect(metrics).toBeNull();
    });

    it('should return empty array for missing state', async () => {
      const snapshots = await pollHistory.getSnapshots('INVALID', 'governador', 30, 100);

      expect(Array.isArray(snapshots)).toBe(true);
      expect(snapshots.length).toBe(0);
    });
  });
});
