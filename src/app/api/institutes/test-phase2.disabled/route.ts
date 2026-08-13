/**
 * Endpoint: POST /api/institutes/test-phase2
 * Test Phase 2 expansion: Browser scraping + 10 institutes
 *
 * Query params:
 *   - mode: 'mock' (default) | 'browser' | 'api'
 *   - institutes: comma-separated list
 *   - timeout: seconds (default: 60)
 *
 * Response:
 *   - 200 OK: Detailed results with parsing accuracy
 */

import { NextRequest, NextResponse } from 'next/server';
import { datafolhaMockClient, ipecMockClient, quaestMockClient } from '@/lib/institutes/mock-clients';
import { datafolhaBrowserClient } from '@/lib/institutes/datafolha-browser-client';
import { tseApiClient } from '@/lib/institutes/tse-api-client';
import { poderDataClient } from '@/lib/institutes/poderdata-client';
import { atlasIntelClient } from '@/lib/institutes/atlasIntel-client';
import {
  ipespeClient,
  mdaClient,
  fsbClient,
  rtbdClient,
  genialQuaestClient,
} from '@/lib/institutes/tier2-clients';
import type { InstituteClientBase, Poll } from '@/lib/institutes/institute-client-base';

const MOCK_CLIENTS = {
  datafolha: datafolhaMockClient,
  ipec: ipecMockClient,
  quaest: quaestMockClient,
  poderdata: datafolhaMockClient,
  atlasintel: datafolhaMockClient,
  ipespe: datafolhaMockClient,
  mda: datafolhaMockClient,
  fsb: datafolhaMockClient,
  rtbd: datafolhaMockClient,
  genial: datafolhaMockClient,
  tse: datafolhaMockClient,
};

const BROWSER_CLIENTS: Record<string, InstituteClientBase> = process.env.NEXT_PUBLIC_ENV === 'production'
  ? {} // Disable browser clients in production (no Playwright in serverless)
  : {
      datafolha: datafolhaBrowserClient,
      poderdata: poderDataClient,
      atlasintel: atlasIntelClient,
      ipespe: ipespeClient,
      mda: mdaClient,
      fsb: fsbClient,
      rtbd: rtbdClient,
      genial: genialQuaestClient,
    };

const API_CLIENTS: Record<string, InstituteClientBase> = {
  tse: tseApiClient,
  poderdata: poderDataClient,
  atlasintel: atlasIntelClient,
  ipespe: ipespeClient,
  mda: mdaClient,
  fsb: fsbClient,
  rtbd: rtbdClient,
  genial: genialQuaestClient,
};

interface PhaseTestSuccess {
  institute: string;
  status: 'success';
  mode: 'mock' | 'browser' | 'api';
  pollsFound: number;
  firstPoll: {
    id: string;
    date: Date;
    sampleSize: number;
    candidates: number;
    moe?: number;
  } | null;
  duration: number;
}

interface PhaseTestError {
  institute: string;
  status: 'error';
  mode?: 'mock' | 'browser' | 'api';
  error: string;
  duration?: number;
}

type PhaseTestResult = PhaseTestSuccess | PhaseTestError;

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') || 'mock') as 'mock' | 'browser' | 'api';
    const institutesList =
      searchParams.get('institutes') || 'datafolha,ipec,quaest,poderdata,atlasintel,ipespe';
    const timeout = parseInt(searchParams.get('timeout') || '60') * 1000;

    const instituteIds = institutesList
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    console.log(`[Phase 2 Test] Mode: ${mode}, Institutes: ${instituteIds.length}`);

    const startTime = Date.now();
    const results = await Promise.allSettled(
      instituteIds.map(async (id): Promise<PhaseTestResult> => {
        const instStart = Date.now();

        try {
          let client;

          if (mode === 'browser' && BROWSER_CLIENTS[id]) {
            client = BROWSER_CLIENTS[id];
            console.log(`[${id}] Using browser scraper`);
          } else if (mode === 'api' && API_CLIENTS[id]) {
            client = API_CLIENTS[id];
            console.log(`[${id}] Using API client`);
          } else {
            client = MOCK_CLIENTS[id as keyof typeof MOCK_CLIENTS];
            console.log(`[${id}] Using mock client`);
          }

          if (!client) {
            throw new Error(`Unknown institute: ${id}`);
          }

          // Fetch with timeout
          const pollsPromise = client.fetch();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          );

          const polls = (await Promise.race([pollsPromise, timeoutPromise])) as Poll[];
          const duration = Date.now() - instStart;

          return {
            institute: id,
            status: 'success',
            mode,
            pollsFound: polls.length,
            firstPoll: polls.length > 0 ? {
              id: polls[0].id,
              date: polls[0].publishDate,
              sampleSize: polls[0].sampleSize,
              candidates: polls[0].results.length,
              moe: polls[0].marginOfError,
            } : null,
            duration,
          };
        } catch (error) {
          const duration = Date.now() - instStart;
          return {
            institute: id,
            status: 'error',
            mode,
            error: error instanceof Error ? error.message : String(error),
            duration,
          };
        }
      })
    );

    const totalDuration = Date.now() - startTime;
    const testResults: PhaseTestResult[] = results.map(r => (r.status === 'fulfilled' ? r.value : {
      institute: 'unknown',
      status: 'error' as const,
      error: String(r.reason),
    }));

    const successful = testResults.filter(r => r.status === 'success');
    const failed = testResults.filter(r => r.status === 'error');

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      phase: '2',
      mode,
      summary: {
        total: testResults.length,
        successful: successful.length,
        failed: failed.length,
        totalPollsFound: successful.reduce((sum, r) => sum + (r.pollsFound || 0), 0),
        totalDuration,
        avgPerInstitute: (totalDuration / testResults.length).toFixed(0) + 'ms',
      },
      results: testResults,
      next_steps: [
        `✅ ${mode} mode working`,
        `✅ ${successful.length}/${testResults.length} institutes responding`,
        failed.length > 0 ? `⚠️  ${failed.length} institutes need debugging` : '✅ All institutes successful',
        'Next: Implement parsing for Phase 2 institutes',
        'Then: Deploy Phase 1+2 and setup daily scheduler',
      ],
    });
  } catch (error) {
    console.error('[Phase 2 Test] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
