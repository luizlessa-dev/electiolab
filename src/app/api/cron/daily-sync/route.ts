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
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncPollsToSupabase } from '@/lib/supabase-sync';
import { datafolhaMockClient, ipecMockClient, quaestMockClient } from '@/lib/institutes/mock-clients';
import { tier3Clients } from '@/lib/institutes/tier3-institutes';

// UUID mapping for Phase 1 institutes
const phase1UUIDs: Record<string, string> = {
  datafolha: '38744dae-cbdf-4ed1-84f9-ada191886146',
  ipec: 'a4cd2d2c-5a0e-4c90-965e-fc6223fd108b',
  quaest: '6aab34cd-f773-4ba6-9c8b-d4569ed273d2',
};

// Phase 1 clients
const phase1Clients = {
  datafolha: datafolhaMockClient,
  ipec: ipecMockClient,
  quaest: quaestMockClient,
};

// Verify cron token
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[Daily Sync] Unauthorized request attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Daily Sync] Starting full sync (38 institutes)...');

  try {
    const startTime = Date.now();
    let totalPolls = 0;
    let totalErrors = 0;
    const phaseResults = [];

    // Phase 1: Datafolha, Ipec, Quaest (3)
    console.log('[Daily Sync] Phase 1: Scraping 3 institutes...');
    const phase1Start = Date.now();
    let phase1Synced = 0;

    for (const [id, client] of Object.entries(phase1Clients)) {
      try {
        const polls = await client.fetch();
        const instituteUUID = phase1UUIDs[id];

        if (polls.length > 0) {
          const result = await syncPollsToSupabase(polls, instituteUUID);
          totalPolls += result.inserted;
          totalErrors += result.errors.length;
          phase1Synced++;
          console.log(`[Phase1] ${id}: ${result.inserted} polls`);
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

    // Phase 3.1: Generic Scraper (28 institutes)
    console.log('[Daily Sync] Phase 3.1: Scraping 28 institutes...');
    const phase3Start = Date.now();
    let phase3Synced = 0;
    let phase3Polls = 0;

    for (const client of tier3Clients) {
      try {
        const polls = await client.fetch();
        if (polls.length > 0) {
          const result = await syncPollsToSupabase(polls, client.instituteId);
          phase3Polls += result.inserted;
          totalPolls += result.inserted;
          totalErrors += result.errors.length;
          phase3Synced++;
          console.log(`[Phase3.1] ${client.instituteName}: ${result.inserted} polls`);
        }
      } catch (error) {
        console.error(`[Phase3.1] ${client.instituteName} failed:`, error);
        totalErrors++;
      }
    }

    phaseResults.push({
      phase: 'Phase 3.1',
      institutes: 28,
      successful: phase3Synced,
      failed: 28 - phase3Synced,
      duration: Date.now() - phase3Start,
      pollsSynced: phase3Polls,
    });

    const duration = Date.now() - startTime;

    console.log('[Daily Sync] ✅ Sync completed');
    console.log(`Total: ${totalPolls} polls, ${totalErrors} errors, ${duration}ms`);

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
    console.error('[Daily Sync] Fatal error:', error);
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
