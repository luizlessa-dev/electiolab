/**
 * Wave 4 Phase 2 Integration Tests
 *
 * Tests for:
 * - Presidential position support
 * - Approval/disapproval metrics
 * - Regional aggregation
 */

import { describe, it, expect } from '@jest/globals';
import { approvalAggregation, type ApprovalPoll } from '@/lib/approval/approval-aggregation';
import { regionalAggregation, RegionalAggregation, REGIONS, type Region } from '@/lib/aggregation/regional-aggregation';

describe('Wave 4 Phase 2: Enriquecimento de Dados', () => {
  // ============================================================================
  // Approval Aggregation Tests
  // ============================================================================

  describe('Approval Aggregation', () => {
    const createMockApprovalPoll = (approval: number, disapproval: number): ApprovalPoll => ({
      candidateName: 'Test Candidate',
      approval,
      disapproval,
      neutral: 100 - approval - disapproval,
      marginOfError: 2.5,
      instituteName: 'Test Institute',
      publishDate: new Date(),
      sampleSize: 2000,
    });

    it('should aggregate approval polls correctly', () => {
      const polls: ApprovalPoll[] = [
        createMockApprovalPoll(40, 30),
        createMockApprovalPoll(42, 28),
        createMockApprovalPoll(38, 32),
      ];

      const result = approvalAggregation.aggregateApprovalPolls(
        polls,
        undefined,
        'presidencial',
        new Date()
      );

      expect(result).toBeDefined();
      expect(result.approval).toBeGreaterThan(0);
      expect(result.disapproval).toBeGreaterThan(0);
      expect(result.samplesUsed).toBe(3);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should calculate approval percentages between 0-100', () => {
      const polls: ApprovalPoll[] = [
        createMockApprovalPoll(45, 35),
        createMockApprovalPoll(50, 30),
      ];

      const result = approvalAggregation.aggregateApprovalPolls(
        polls,
        undefined,
        'presidencial',
        new Date()
      );

      expect(result.approval).toBeGreaterThanOrEqual(0);
      expect(result.approval).toBeLessThanOrEqual(100);
      expect(result.disapproval).toBeGreaterThanOrEqual(0);
      expect(result.disapproval).toBeLessThanOrEqual(100);
      expect(result.neutral).toBeGreaterThanOrEqual(0);
      expect(result.neutral).toBeLessThanOrEqual(100);
    });

    it('should handle empty polls gracefully', () => {
      const result = approvalAggregation.aggregateApprovalPolls([], undefined, 'presidencial', new Date());

      expect(result).toBeDefined();
      expect(result.approval).toBe(0);
      expect(result.samplesUsed).toBe(0);
    });

    it('should compare two approval periods', () => {
      const oldPolls: ApprovalPoll[] = [
        createMockApprovalPoll(38, 32),
        createMockApprovalPoll(40, 30),
      ];

      const newPolls: ApprovalPoll[] = [
        createMockApprovalPoll(42, 28),
        createMockApprovalPoll(45, 25),
      ];

      const comparison = approvalAggregation.compareApprovalPeriods(
        oldPolls,
        newPolls,
        new Date(),
        'presidencial'
      );

      expect(comparison.previous).toBeDefined();
      expect(comparison.current).toBeDefined();
      expect(comparison.changes.approvalChange).toBeDefined();
      expect(comparison.changes.trend).toMatch(/improving|declining|stable/);
    });

    it('should support governor approval', () => {
      const polls: ApprovalPoll[] = [createMockApprovalPoll(52, 28)];

      const result = approvalAggregation.aggregateApprovalPolls(
        polls,
        'SP',
        'governador',
        new Date()
      );

      expect(result).toBeDefined();
      expect(result.position).toBe('governador');
      expect(result.state).toBe('SP');
    });
  });

  // ============================================================================
  // Regional Aggregation Tests
  // ============================================================================

  describe('Regional Aggregation', () => {
    const createMockStateResult = (state: string) => ({
      state,
      position: 'governador',
      candidates: [
        { name: 'Candidate A', party: 'PT', percentage: 35, confidence: 0.85, samplesUsed: 10 },
        { name: 'Candidate B', party: 'PL', percentage: 28, confidence: 0.82, samplesUsed: 10 },
      ],
    });

    it('should aggregate regional results', () => {
      const stateResults = [
        createMockStateResult('SP'),
        createMockStateResult('RJ'),
        createMockStateResult('MG'),
        createMockStateResult('ES'),
      ];

      const result = regionalAggregation.aggregateRegion(
        stateResults,
        'sudeste',
        'governador',
        new Date()
      );

      expect(result).toBeDefined();
      expect(result.region).toBe('sudeste');
      expect(result.regionName).toBe('Sudeste');
      expect(result.states).toContain('SP');
      expect(result.states.length).toBe(4);
    });

    it('should calculate regional candidates', () => {
      const stateResults = [
        createMockStateResult('RS'),
        createMockStateResult('SC'),
        createMockStateResult('PR'),
      ];

      const result = regionalAggregation.aggregateRegion(
        stateResults,
        'sul',
        'governador',
        new Date()
      );

      expect(result.candidates.length).toBeGreaterThan(0);
      result.candidates.forEach(c => {
        expect(c.percentage).toBeGreaterThanOrEqual(0);
        expect(c.percentage).toBeLessThanOrEqual(100);
        expect(c.statesWithData.length).toBeGreaterThan(0);
      });
    });

    it('should weight by state population', () => {
      // SP and ES are both in "sudeste" — SP has ~46.6M people vs ES's ~4M
      const stateResults = [
        {
          state: 'SP',
          position: 'governador',
          candidates: [{ name: 'Candidate A', percentage: 30, confidence: 0.85, samplesUsed: 10 }],
        },
        {
          state: 'ES',
          position: 'governador',
          candidates: [{ name: 'Candidate A', percentage: 50, confidence: 0.85, samplesUsed: 10 }],
        },
      ];

      const result = regionalAggregation.aggregateRegion(
        stateResults,
        'sudeste',
        'governador',
        new Date()
      );

      // SP has much higher population, so regional should be closer to 30 than 50
      const candidateA = result.candidates.find(c => c.name === 'Candidate A');
      expect(candidateA?.percentage).toBeLessThan(35);
    });

    it('should handle partial coverage', () => {
      const stateResults = [
        createMockStateResult('BA'),
        createMockStateResult('PE'),
        // Missing other nordeste states
      ];

      const result = regionalAggregation.aggregateRegion(
        stateResults,
        'nordeste',
        'governador',
        new Date()
      );

      expect(result.qualityMetrics.coverageRatio).toBeLessThan(1);
      expect(result.qualityMetrics.statesCovered).toBe(2);
      expect(result.qualityMetrics.totalStates).toBe(9); // Nordeste has 9 states
    });

    it('should get region for state', () => {
      expect(RegionalAggregation.getRegionForState('SP')).toBe('sudeste');
      expect(RegionalAggregation.getRegionForState('RS')).toBe('sul');
      expect(RegionalAggregation.getRegionForState('BA')).toBe('nordeste');
      expect(RegionalAggregation.getRegionForState('XX')).toBeNull();
    });

    it('should get states in region', () => {
      const sulStates = RegionalAggregation.getStatesInRegion('sul');
      expect(sulStates).toContain('RS');
      expect(sulStates).toContain('SC');
      expect(sulStates).toContain('PR');
      expect(sulStates.length).toBe(3);
    });

    it('should compare multiple regions', () => {
      const results = (Object.keys(REGIONS) as Region[]).map(region => ({
        region,
        result: regionalAggregation.aggregateRegion(
          [createMockStateResult(REGIONS[region].states[0])],
          region,
          'governador',
          new Date()
        ),
      }));

      const comparison = regionalAggregation.compareRegions(results);

      expect(comparison.regions.length).toBe(5);
      expect(Array.isArray(comparison.regionDifferences)).toBe(true);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration: Approval + Regional', () => {
    it('should support approval aggregation for regions', () => {
      const polls: ApprovalPoll[] = [
        {
          candidateName: 'Governor A',
          approval: 50,
          disapproval: 30,
          neutral: 20,
          marginOfError: 2.5,
          instituteName: 'Institute A',
          publishDate: new Date(),
          sampleSize: 2000,
        },
      ];

      const approvalResult = approvalAggregation.aggregateApprovalPolls(
        polls,
        'SP',
        'governador',
        new Date()
      );

      expect(approvalResult).toBeDefined();
      expect(approvalResult.state).toBe('SP');
      expect(approvalResult.approval).toBeCloseTo(50, 5);
    });
  });

  // ============================================================================
  // Regional Constants Tests
  // ============================================================================

  describe('Regional Constants', () => {
    it('should have all 5 regions defined', () => {
      expect(Object.keys(REGIONS).length).toBe(5);
      expect(REGIONS.sul).toBeDefined();
      expect(REGIONS.sudeste).toBeDefined();
      expect(REGIONS['centro-oeste']).toBeDefined();
      expect(REGIONS.nordeste).toBeDefined();
      expect(REGIONS.norte).toBeDefined();
    });

    it('should have all 27 states assigned', () => {
      const allStates = Object.values(REGIONS)
        .flatMap(r => r.states)
        .sort();

      const uniqueStates = [...new Set(allStates)];
      expect(uniqueStates.length).toBe(27);
    });

    it('should have correct state counts per region', () => {
      expect(REGIONS.sul.states.length).toBe(3);
      expect(REGIONS.sudeste.states.length).toBe(4);
      expect(REGIONS['centro-oeste'].states.length).toBe(4);
      expect(REGIONS.nordeste.states.length).toBe(9);
      expect(REGIONS.norte.states.length).toBe(7);
    });

    it('should have no duplicate states', () => {
      const allStates = Object.values(REGIONS).flatMap(r => r.states);
      const uniqueStates = new Set(allStates);

      expect(allStates.length).toBe(uniqueStates.size);
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should aggregate approval within timeout', () => {
      const polls: ApprovalPoll[] = Array.from({ length: 50 }, (_, i) => ({
        candidateName: 'Test',
        approval: 40 + Math.random() * 10,
        disapproval: 30 + Math.random() * 10,
        neutral: 30 - Math.random() * 10,
        marginOfError: 2.5,
        instituteName: `Institute ${i}`,
        publishDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        sampleSize: 2000,
      }));

      const start = Date.now();
      approvalAggregation.aggregateApprovalPolls(polls, undefined, 'presidencial', new Date());
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('should aggregate regional within timeout', () => {
      const stateResults = REGIONS.sudeste.states.map(state => ({
          state,
          position: 'governador',
          candidates: [
            { name: 'Candidate A', percentage: 35, confidence: 0.85, samplesUsed: 10 },
          ],
        }));

      const start = Date.now();
      regionalAggregation.aggregateRegion(stateResults, 'sudeste', 'governador', new Date());
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });
});
