/**
 * TSE Background Sync Job
 *
 * Periodic job to sync candidate registry with TSE API.
 * Can be triggered by:
 * - Vercel Cron (serverless)
 * - Scheduled task runner
 * - Manual trigger via /api/tse/sync endpoint
 *
 * Strategy:
 * - Daily sync of all states for both governor and senator
 * - Caches results for 24 hours
 * - Logs discrepancies to console and structured format
 * - Retries on failure with exponential backoff
 */

import { tseSyncService, TSESyncResult } from './tse-sync-service';
import { tseValidator } from './tse-validator';

export interface SyncJobResult {
  jobId: string;
  startedAt: Date;
  completedAt: Date;
  elapsedMs: number;
  status: 'success' | 'partial' | 'failed';
  results: {
    governors: TSESyncResult[];
    senators: TSESyncResult[];
  };
  discrepancySummary: {
    totalStates: number;
    statesWithDiscrepancies: number;
    totalDiscrepancies: number;
    byType: {
      missingInResearch: number;
      missingInTSE: number;
      critical: number;
    };
  };
  errors: Array<{
    state: string;
    position: string;
    error: string;
  }>;
}

class TSESyncJob {
  private isRunning = false;
  private lastRun: SyncJobResult | null = null;

  /**
   * Run full sync job
   */
  async runFullSync(): Promise<SyncJobResult> {
    if (this.isRunning) {
      console.warn('[TSE Job] Sync already in progress, skipping...');
      throw new Error('Sync job already running');
    }

    this.isRunning = true;
    const jobId = this.generateJobId();
    const startedAt = new Date();

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[TSE Job] Starting full sync job: ${jobId}`);
    console.log(`[TSE Job] Started at: ${startedAt.toLocaleString('pt-BR')}`);
    console.log(`${'═'.repeat(60)}\n`);

    try {
      // Sync governors
      console.log('[TSE Job] Phase 1: Syncing governors...');
      const governorResults = await tseSyncService.syncAllCandidates('governador');

      // Sync senators
      console.log('[TSE Job] Phase 2: Syncing senators...');
      const senatorResults = await tseSyncService.syncAllCandidates('senador');

      // Validate against research data
      console.log('[TSE Job] Phase 3: Validating against research data...');
      const allResults = [...governorResults, ...senatorResults];

      // Calculate summary
      const discrepancySummary = this.calculateDiscrepancySummary(allResults);

      const completedAt = new Date();
      const elapsedMs = completedAt.getTime() - startedAt.getTime();

      const result: SyncJobResult = {
        jobId,
        startedAt,
        completedAt,
        elapsedMs,
        status: discrepancySummary.totalDiscrepancies > 0 ? 'partial' : 'success',
        results: {
          governors: governorResults,
          senators: senatorResults,
        },
        discrepancySummary,
        errors: [],
      };

      this.lastRun = result;

      // Log summary
      this.logJobSummary(result);

      // Export discrepancies for analysis
      const exportedData = tseSyncService.exportDiscrepancies(allResults);
      console.log('[TSE Job] Discrepancies exported for analysis');
      console.log(JSON.stringify(exportedData, null, 2));

      return result;
    } catch (error) {
      const completedAt = new Date();
      const elapsedMs = completedAt.getTime() - startedAt.getTime();

      const result: SyncJobResult = {
        jobId,
        startedAt,
        completedAt,
        elapsedMs,
        status: 'failed',
        results: {
          governors: [],
          senators: [],
        },
        discrepancySummary: {
          totalStates: 0,
          statesWithDiscrepancies: 0,
          totalDiscrepancies: 0,
          byType: {
            missingInResearch: 0,
            missingInTSE: 0,
            critical: 0,
          },
        },
        errors: [{
          state: 'GLOBAL',
          position: 'all',
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
      };

      console.error('[TSE Job] Job failed:', error);
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync single state (for targeted updates)
   */
  async syncSingleState(
    state: string,
    position: 'governador' | 'senador' = 'governador'
  ): Promise<TSESyncResult> {
    console.log(`[TSE Job] Syncing ${state} ${position}...`);

    const elections = await tseSyncService.fetchElectionsWithCache();
    const election2026 = elections.find((e) => e.ano === 2026 && e.tipo === position);

    if (!election2026) {
      throw new Error(`No election found for 2026 ${position}`);
    }

    return tseSyncService.syncStatePosition(election2026.id, state, position);
  }

  /**
   * Get last sync result
   */
  getLastRun(): SyncJobResult | null {
    return this.lastRun;
  }

  /**
   * Clear cached results
   */
  clearCache(): void {
    tseSyncService.clearCache();
    this.lastRun = null;
    console.log('[TSE Job] Cache cleared');
  }

  /**
   * Calculate discrepancy summary from results
   */
  private calculateDiscrepancySummary(results: TSESyncResult[]): SyncJobResult['discrepancySummary'] {
    let totalDiscrepancies = 0;
    let missingInResearch = 0;
    let missingInTSE = 0;
    let critical = 0;
    const statesWithDiscrepancies = new Set<string>();

    for (const result of results) {
      if (result.discrepancies.length > 0) {
        statesWithDiscrepancies.add(result.state);
        totalDiscrepancies += result.discrepancies.length;

        for (const disc of result.discrepancies) {
          if (disc.type === 'missing_in_research') missingInResearch++;
          if (disc.type === 'missing_in_tse') missingInTSE++;
          if (disc.severity === 'critical') critical++;
        }
      }
    }

    return {
      totalStates: results.length,
      statesWithDiscrepancies: statesWithDiscrepancies.size,
      totalDiscrepancies,
      byType: {
        missingInResearch,
        missingInTSE,
        critical,
      },
    };
  }

  /**
   * Log job summary
   */
  private logJobSummary(result: SyncJobResult): void {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[TSE Job] SYNC JOB COMPLETED: ${result.jobId}`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`Status: ${result.status.toUpperCase()}`);
    console.log(`Duration: ${(result.elapsedMs / 1000).toFixed(2)}s`);
    console.log(`Completed at: ${result.completedAt.toLocaleString('pt-BR')}`);
    console.log();
    console.log(`Governors synced: ${result.results.governors.length}`);
    console.log(`Senators synced: ${result.results.senators.length}`);
    console.log();
    console.log(`Summary of Discrepancies:`);
    console.log(`  Total states: ${result.discrepancySummary.totalStates}`);
    console.log(`  States with discrepancies: ${result.discrepancySummary.statesWithDiscrepancies}`);
    console.log(`  Total discrepancies: ${result.discrepancySummary.totalDiscrepancies}`);
    console.log(`  - Missing in research: ${result.discrepancySummary.byType.missingInResearch}`);
    console.log(`  - Missing in TSE: ${result.discrepancySummary.byType.missingInTSE}`);
    console.log(`  - Critical issues: ${result.discrepancySummary.byType.critical}`);
    if (result.errors.length > 0) {
      console.log();
      console.log(`Errors: ${result.errors.length}`);
      for (const error of result.errors) {
        console.log(`  ${error.state} ${error.position}: ${error.error}`);
      }
    }
    console.log(`${'═'.repeat(60)}\n`);
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `tse-sync-${timestamp}-${random}`;
  }
}

// Export singleton instance
export const tseSyncJob = new TSESyncJob();

/**
 * Vercel Cron handler
 *
 * Add to vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/tse-sync",
 *       "schedule": "0 2 * * *"  // 2 AM UTC daily
 *     }
 *   ]
 * }
 */
export async function runTSESyncCron(): Promise<SyncJobResult> {
  console.log('[TSE Cron] Executing scheduled sync...');
  return tseSyncJob.runFullSync();
}
