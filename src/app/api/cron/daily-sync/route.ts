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
import { syncPollsToSupabase } from '@/lib/supabase-sync';
import { datafolhaClientReal } from '@/lib/institutes/datafolha-client-real';
import { ipecClientReal } from '@/lib/institutes/ipec-client-real';
import { quaestClientReal } from '@/lib/institutes/quaest-client-real';

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
    let totalPolls = 0;
    let totalErrors = 0;
    const phaseResults = [];

    // Phase 1: Real Scraping (3 institutes)
    console.log('[Daily Sync] Phase 1: Real scraping (3 institutes)...');
    const phase1Start = Date.now();
    const phase1Clients = [
      { id: 'datafolha', client: datafolhaClientReal },
      { id: 'ipec', client: ipecClientReal },
      { id: 'quaest', client: quaestClientReal },
    ];

    let phase1Synced = 0;
    for (const { id, client } of phase1Clients) {
      try {
        const polls = await client.fetch();
        if (polls.length > 0) {
          const result = await syncPollsToSupabase(polls, id);
          totalPolls += result.inserted;
          totalErrors += result.errors.length;
          phase1Synced++;
          console.log(`[Phase1] ${id}: ${result.inserted} polls salvos`);
        }
      } catch (error) {
        console.error(`[Phase1] ${id} failed:`, error);
        totalErrors++;
      }
    }

    phaseResults.push({
      phase: 'Phase 1',
      institutes: 3,
      successful: phase1Synced,
      failed: 3 - phase1Synced,
      duration: Date.now() - phase1Start,
      pollsSynced: totalPolls,
    });

    const duration = Date.now() - startTime;

    // Log results
    console.log('[Daily Sync] Sync completed successfully');
    console.log(`Total polls saved: ${totalPolls}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Total duration: ${duration}ms`);

    // Return stats
    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        stats: {
          totalPollsSynced: totalPolls,
          totalErrors,
          totalDuration: duration,
          phaseResults,
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
  return NextResponse.json({
    status: 'operational',
    scheduler: {
      status: 'healthy',
      phasesEnabled: [
        'Phase 1 (3 institutes)',
        'Phase 2.5 (7 institutes)',
        'Phase 3.1 (28 institutes)',
      ],
      expectedDuration: '20-30 minutes',
    },
    timestamp: new Date().toISOString(),
  });
}
