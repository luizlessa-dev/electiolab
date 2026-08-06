/**
 * Cron Endpoint: Daily Institute Sync
 *
 * POST /api/cron/daily-sync
 *
 * Runs the master scheduler daily to sync all 38 institutes:
 * - Phase 1 (3): Datafolha, Ipec, Quaest
 * - Phase 2.5 (7): Hybrid scrapers
 * - Phase 3.1 (28): Generic scrapers
 *
 * Scheduled to run daily at 09:00 AM BRT via Vercel cron
 *
 * Deployment:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-sync",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { scheduler } from '@/lib/institutes/master-scheduler';

// Verify cron token
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[Daily Sync] Unauthorized request attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Daily Sync] Starting scheduled sync...');

  try {
    const startTime = Date.now();

    // Run full sync
    const stats = await scheduler.runDailySync();

    const duration = Date.now() - startTime;

    // Log results
    console.log('[Daily Sync] Sync completed successfully');
    console.log(`Total duration: ${duration}ms`);
    console.log(
      `Success rate: ${((stats.successfulSyncs / stats.totalInstitutesTested) * 100).toFixed(1)}%`
    );

    // Return stats
    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        stats: {
          totalInstitutesTested: stats.totalInstitutesTested,
          successfulSyncs: stats.successfulSyncs,
          failedSyncs: stats.failedSyncs,
          totalDuration: stats.totalDuration,
          successRate: (stats.successfulSyncs / stats.totalInstitutesTested) * 100,
          phaseResults: stats.phaseResults.map(p => ({
            phase: p.phase,
            institutes: p.institutes,
            successful: p.successful,
            failed: p.failed,
            duration: p.duration,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Daily Sync] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Health check
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const health = await scheduler.getHealth();
    return NextResponse.json({
      status: 'operational',
      scheduler: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
