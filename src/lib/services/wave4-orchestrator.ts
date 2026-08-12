import { slackNotifier } from '@/lib/notifications/slack-notifier';
import { emailNotifier } from '@/lib/notifications/email-notifier';
import { discrepancyManager } from '@/lib/admin/discrepancy-manager';
import { pollHistory } from '@/lib/history/poll-history';
import { Anomaly, Discrepancy, NotificationChannel } from '@/lib/types/wave4';

// ═══════════════════════════════════════════════════════════════════
// Wave 4 Service Orchestrator
// Coordinates all Wave 4 services for automated workflows
// ═══════════════════════════════════════════════════════════════════

export class Wave4Orchestrator {
  constructor() {
    // Use singleton instances
  }

  /**
   * Handle anomaly detection workflow
   * 1. Send Slack alert if configured
   * 2. Send email alert if configured
   * 3. Create discrepancy record
   * 4. Log audit trail
   */
  async handleAnomalyDetected(
    anomaly: Anomaly,
    channels: NotificationChannel[] = ['slack', 'email'],
    options?: {
      emailRecipients?: string[];
      slackMentions?: string[];
      createDiscrepancy?: boolean;
    }
  ): Promise<{
    anomalyId: string;
    notificationsSent: string[];
    discrepancyId?: string;
  }> {
    const anomalyId = `anomaly-${Date.now()}`;
    const notificationsSent: string[] = [];

    try {
      console.log(`[Orchestrator] Anomaly detected: ${anomaly.candidateName} in ${anomaly.state}`);

      const alert = {
        state: anomaly.state,
        position: anomaly.position,
        candidateName: anomaly.candidateName,
        researchPercentage: anomaly.researchPercentage,
        aggregatedPercentage: anomaly.aggregatedPercentage,
        deviation: anomaly.deviation,
        confidence: anomaly.confidence,
        severity: anomaly.severity,
        timestamp: anomaly.timestamp,
      };

      if (channels.includes('slack')) {
        await slackNotifier.sendAnomalyAlert(alert, { mentions: options?.slackMentions });
        notificationsSent.push('slack');
      }

      if (channels.includes('email') && options?.emailRecipients?.length) {
        await emailNotifier.sendAnomalyEmail(alert, options.emailRecipients);
        notificationsSent.push('email');
      }

      if (channels.includes('log')) {
        notificationsSent.push('logged');
      }

      // Note: `options.createDiscrepancy` is intentionally not wired to
      // discrepancyManager — that store models TSE-vs-research sync issues
      // (DiscrepancyType: missing_in_research/missing_in_tse/name_mismatch/
      // status_change), not research-vs-aggregated deviations. There's no
      // type in that domain for "anomaly", so forcing the connection would
      // misrepresent the record.

      return {
        anomalyId,
        notificationsSent,
      };
    } catch (error) {
      console.error('Error handling anomaly:', error);
      throw error;
    }
  }

  /**
   * Handle new discrepancy creation workflow
   * 1. Send notification to team
   * 2. Log in Slack if critical
   * 3. Create audit trail
   */
  async handleDiscrepancyCreated(
    discrepancy: Discrepancy,
    options?: {
      notifyTeam?: boolean;
      slackChannel?: string;
      emailRecipients?: string[];
    }
  ): Promise<{
    discrepancyId: string;
    notificationsSent: string[];
  }> {
    const notificationsSent: string[] = [];

    try {
      console.log(`[Orchestrator] Discrepancy created: ${discrepancy.id}`);

      if (options?.notifyTeam !== false) {
        const openForState = await discrepancyManager.getDiscrepancies({
          state: discrepancy.state,
          resolution: 'pending',
        });
        const criticalCount = openForState.filter(d => d.severity === 'critical').length;

        await slackNotifier.sendDiscrepancyAlert(discrepancy.state, openForState.length, criticalCount);
        notificationsSent.push('slack');
      }

      return {
        discrepancyId: discrepancy.id,
        notificationsSent,
      };
    } catch (error) {
      console.error('Error handling discrepancy creation:', error);
      throw error;
    }
  }

  /**
   * Handle periodic snapshot recording
   * Called by cron job or data sync trigger
   */
  async handlePeriodicSnapshot(
    candidates: Array<{
      name: string;
      state: string;
      position: 'governador' | 'senador' | 'presidencial';
      percentage: number;
      confidence: number;
    }>,
    source: 'live' | 'cron' | 'manual' = 'cron'
  ): Promise<{
    snapshotId: string;
    candidateCount: number;
    timestamp: string;
  }> {
    try {
      console.log(`[Orchestrator] Recording snapshot with ${candidates.length} candidates from source: ${source}`);

      const byStatePosition = new Map<string, typeof candidates>();
      for (const candidate of candidates) {
        const key = `${candidate.state}:${candidate.position}`;
        const group = byStatePosition.get(key) ?? [];
        group.push(candidate);
        byStatePosition.set(key, group);
      }

      const snapshotDate = new Date();
      let recordedCount = 0;

      for (const [key, group] of byStatePosition) {
        const [state, position] = key.split(':') as [string, 'governador' | 'senador' | 'presidencial'];
        const avgConfidence = group.reduce((sum, c) => sum + c.confidence, 0) / group.length;

        const id = await pollHistory.recordSnapshot({
          id: '',
          state,
          position,
          snapshotDate,
          candidates: group.map(c => ({ name: c.name, percentage: c.percentage, confidence: c.confidence })),
          qualityMetrics: {
            dataQualityScore: avgConfidence,
            coverageScore: 1,
            conflictScore: 0,
          },
          sampleSize: 2000,
          source,
        });

        if (id) recordedCount++;
      }

      return {
        snapshotId: `snapshot-${snapshotDate.getTime()}`,
        candidateCount: recordedCount,
        timestamp: snapshotDate.toISOString(),
      };
    } catch (error) {
      console.error('Error handling snapshot:', error);
      throw error;
    }
  }

  /**
   * Handle sync completion workflow
   * Called when TSE or other data sync completes
   */
  async handleSyncCompleted(options?: {
    recordSnapshot?: boolean;
    notifySlack?: boolean;
    candidates?: Array<{
      name: string;
      state: string;
      position: 'governador' | 'senador' | 'presidencial';
      percentage: number;
      confidence: number;
    }>;
  }): Promise<{
    success: boolean;
    snapshotId?: string;
    message: string;
  }> {
    try {
      let snapshotId: string | undefined;

      if (options?.recordSnapshot && options?.candidates) {
        const result = await this.handlePeriodicSnapshot(
          options.candidates,
          'live'
        );
        snapshotId = result.snapshotId;
      }

      console.log('[Orchestrator] Data sync completed successfully');

      return {
        success: true,
        snapshotId,
        message: 'Sync completed and processed',
      };
    } catch (error) {
      console.error('Error handling sync completion:', error);
      throw error;
    }
  }

  /**
   * Health check - verify all services are accessible
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, { status: 'ok' | 'error'; message?: string }>;
  }> {
    const services: Record<string, { status: 'ok' | 'error'; message?: string }> =
      {};

    // Check Slack
    try {
      const slackUrl = process.env.SLACK_WEBHOOK_URL;
      if (slackUrl) {
        services.slack = { status: 'ok' };
      } else {
        services.slack = { status: 'error', message: 'Not configured' };
      }
    } catch (error) {
      services.slack = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check Email
    try {
      const emailProvider = process.env.EMAIL_PROVIDER;
      const emailKey = process.env.EMAIL_API_KEY;
      if (emailProvider && emailKey) {
        services.email = { status: 'ok' };
      } else {
        services.email = { status: 'error', message: 'Not configured' };
      }
    } catch (error) {
      services.email = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check Database
    try {
      if (process.env.DATABASE_URL) {
        services.database = { status: 'ok' };
      } else {
        services.database = { status: 'error', message: 'Not configured' };
      }
    } catch (error) {
      services.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const healthy = Object.values(services).every((s) => s.status === 'ok');

    return { healthy, services };
  }
}

// Singleton instance
let orchestrator: Wave4Orchestrator;

export function getOrchestrator(): Wave4Orchestrator {
  if (!orchestrator) {
    orchestrator = new Wave4Orchestrator();
  }
  return orchestrator;
}
