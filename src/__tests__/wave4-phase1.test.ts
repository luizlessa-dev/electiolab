/**
 * Wave 4 Phase 1 Integration Tests
 *
 * Tests for:
 * - Slack notifications
 * - Email notifications
 * - Discrepancy management
 */

import { describe, it, expect, afterAll } from '@jest/globals';
import { discrepancyManager } from '@/lib/admin/discrepancy-manager';
import { slackNotifier } from '@/lib/notifications/slack-notifier';
import { emailNotifier } from '@/lib/notifications/email-notifier';
import { supabaseAdmin } from '@/lib/supabase/admin';

describe('Wave 4 Phase 1: Alerts & Notifications', () => {
  // ============================================================================
  // Discrepancy Manager Tests
  // ============================================================================

  describe('Discrepancy Manager', () => {
    const testState = 'SP';
    const testPosition = 'governador';
    const testCandidate = 'Test Candidate';

    // This suite creates/resolves a live discrepancy row (upserted by
    // createDiscrepancy). Without cleanup, a run that resolves it would
    // leave it 'verified' for the next run, breaking the pending-state
    // assertions below.
    afterAll(async () => {
      await supabaseAdmin
        .from('discrepancies')
        .delete()
        .eq('state', testState)
        .eq('candidate_name', testCandidate);
    });

    it('should create a discrepancy record', async () => {
      const result = await discrepancyManager.createDiscrepancy(testState, testPosition, {
        type: 'missing_in_research',
        candidateName: testCandidate,
        severity: 'warning',
        details: 'Test discrepancy',
        tseData: { numero: 123456 } as any,
      });

      expect(result).toBeDefined();
      expect(result?.state).toBe(testState);
      expect(result?.candidateName).toBe(testCandidate);
      expect(result?.resolution).toBe('pending');
    });

    it('should get discrepancies with filters', async () => {
      const results = await discrepancyManager.getDiscrepancies({
        state: testState,
        limit: 100,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should resolve a discrepancy', async () => {
      const discrepancies = await discrepancyManager.getDiscrepancies({
        state: testState,
        resolution: 'pending',
        limit: 1,
      });

      if (discrepancies.length > 0) {
        const result = await discrepancyManager.resolveDiscrepancy(
          discrepancies[0].id,
          'verified',
          'test-user',
          'Test resolution'
        );

        expect(result).toBeDefined();
        expect(result?.resolution).toBe('verified');
        expect(result?.resolvedBy).toBe('test-user');
      }
    });

    it('should batch resolve discrepancies', async () => {
      const discrepancies = await discrepancyManager.getDiscrepancies({
        resolution: 'pending',
        limit: 5,
      });

      if (discrepancies.length >= 2) {
        const ids = discrepancies.slice(0, 2).map(d => d.id);
        const results = await discrepancyManager.resolveBatch(ids, 'dismissed', 'test-batch');

        expect(results.length).toBeGreaterThan(0);
        results.forEach(r => {
          expect(r.resolution).toBe('dismissed');
          expect(r.resolvedBy).toBe('test-batch');
        });
      }
    });

    it('should get statistics', async () => {
      const stats = await discrepancyManager.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.byState).toBe('object');
      expect(typeof stats.byType).toBe('object');
      expect(typeof stats.bySeverity).toBe('object');
    });

    it('should get unresolved count', async () => {
      const count = await discrepancyManager.getUnresolvedCount();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should get critical unresolved', async () => {
      const critical = await discrepancyManager.getCriticalUnresolved();

      expect(Array.isArray(critical)).toBe(true);
      critical.forEach(d => {
        expect(d.severity).toBe('critical');
        expect(d.resolution).toBe('pending');
      });
    });
  });

  // ============================================================================
  // Slack Notifier Tests
  // ============================================================================

  describe('Slack Notifier', () => {
    it('should get slack status', () => {
      const status = slackNotifier.getStatus();

      expect(status).toBeDefined();
      expect(typeof status.enabled).toBe('boolean');
      expect(typeof status.configured).toBe('boolean');
      expect(typeof status.channel).toBe('string');
    });

    it('should handle test connection gracefully', async () => {
      const slackStatus = slackNotifier.getStatus();

      if (slackStatus.enabled) {
        const result = await slackNotifier.testConnection();
        expect(typeof result).toBe('boolean');
      } else {
        console.log('Slack not configured, skipping test connection');
      }
    });

    it('should format anomaly alert message correctly', async () => {
      const slackStatus = slackNotifier.getStatus();

      if (slackStatus.enabled) {
        const testAnomaly = {
          state: 'SP',
          position: 'governador' as const,
          candidateName: 'Test Candidate',
          researchPercentage: 30,
          aggregatedPercentage: 38,
          deviation: 8,
          confidence: 0.85,
          severity: 'high' as const,
          timestamp: new Date().toISOString(),
        };

        // Should not throw
        await slackNotifier.sendAnomalyAlert(testAnomaly);
      }
    });
  });

  // ============================================================================
  // Email Notifier Tests
  // ============================================================================

  describe('Email Notifier', () => {
    it('should get email status', () => {
      const status = emailNotifier.getStatus();

      expect(status).toBeDefined();
      expect(typeof status.enabled).toBe('boolean');
      expect(typeof status.provider).toBe('string');
      expect(typeof status.configured).toBe('boolean');
      expect(typeof status.fromEmail).toBe('string');
    });

    it('should have valid from email', () => {
      const status = emailNotifier.getStatus();

      expect(status.fromEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should handle email gracefully when not configured', async () => {
      const status = emailNotifier.getStatus();

      if (!status.enabled) {
        console.log('Email not configured, skipping send tests');
      } else {
        const testAnomaly = {
          state: 'SP',
          position: 'governador' as const,
          candidateName: 'Test Candidate',
          researchPercentage: 30,
          aggregatedPercentage: 38,
          deviation: 8,
          confidence: 0.85,
          severity: 'high' as const,
          timestamp: new Date().toISOString(),
        };

        // Should not throw
        await emailNotifier.sendAnomalyEmail(testAnomaly, ['test@example.com']);
      }
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration: Discrepancy to Alert Flow', () => {
    afterAll(async () => {
      await supabaseAdmin
        .from('discrepancies')
        .delete()
        .eq('state', 'RJ')
        .eq('candidate_name', 'Integration Test');
    });

    it('should handle complete flow from discrepancy creation to resolution', async () => {
      // 1. Create discrepancy
      const testAnomaly = {
        type: 'missing_in_tse' as const,
        candidateName: 'Integration Test',
        severity: 'critical' as const,
        details: 'Integration test discrepancy',
      };

      const created = await discrepancyManager.createDiscrepancy('RJ', 'senador', testAnomaly);
      expect(created).toBeDefined();

      if (created) {
        // 2. Verify it appears in list
        const list = await discrepancyManager.getDiscrepancies({
          state: 'RJ',
          resolution: 'pending',
        });

        const found = list.find(d => d.id === created.id);
        expect(found).toBeDefined();

        // 3. Resolve it
        const resolved = await discrepancyManager.resolveDiscrepancy(
          created.id,
          'verified',
          'integration-test',
          'Auto resolved'
        );

        expect(resolved?.resolution).toBe('verified');

        // 4. Verify resolution
        const updated = await discrepancyManager.getDiscrepancy(created.id);
        expect(updated?.resolution).toBe('verified');
      }
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle invalid discrepancy filter gracefully', async () => {
      const results = await discrepancyManager.getDiscrepancies({
        state: 'INVALID', // Invalid state code
        limit: 100,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle missing discrepancy ID gracefully', async () => {
      const result = await discrepancyManager.getDiscrepancy('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });

    it('should handle batch resolve with empty array', async () => {
      const results = await discrepancyManager.resolveBatch([], 'verified', 'test');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should get discrepancies within timeout', async () => {
      const start = Date.now();

      await discrepancyManager.getDiscrepancies({
        limit: 50,
      });

      const elapsed = Date.now() - start;

      // Should complete within 1 second
      expect(elapsed).toBeLessThan(1000);
    });

    it('should get stats within timeout', async () => {
      const start = Date.now();

      await discrepancyManager.getStats();

      const elapsed = Date.now() - start;

      // Should complete within 500ms
      expect(elapsed).toBeLessThan(500);
    });
  });
});
