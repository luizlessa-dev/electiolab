/**
 * GET /api/cron/tse-sync
 *
 * Vercel Cron handler for periodic TSE synchronization.
 *
 * Schedule in vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/tse-sync",
 *       "schedule": "0 2 * * *"  // 2 AM UTC daily
 *     }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { tseSyncJob } from '@/lib/tse/tse-sync-job';

// Verify request is from Vercel
function isValidVercelCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('[TSE Cron] CRON_SECRET not configured, skipping verification');
    return true; // Allow in dev
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify request
  if (!isValidVercelCronRequest(request)) {
    console.error('[TSE Cron] Unauthorized cron request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('[TSE Cron] Running scheduled sync...');

    const result = await tseSyncJob.runFullSync();

    return NextResponse.json(
      {
        ok: true,
        jobId: result.jobId,
        status: result.status,
        elapsedMs: result.elapsedMs,
        summary: result.discrepancySummary,
        executedAt: new Date().toISOString(),
      },
      {
        status: result.status === 'failed' ? 500 : 200,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('[TSE Cron] Sync failed:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
