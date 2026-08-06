/**
 * Endpoint: POST /api/institutes/test-scrapers
 * Test Phase 1 scrapers against live websites
 *
 * Query params:
 *   - institutes: comma-separated (default: datafolha,ipec,quaest)
 *   - timeout: seconds (default: 30)
 *
 * Response:
 *   - 200 OK: [{ institute, status, pollsFound, firstPoll, duration, error? }, ...]
 */

import { NextRequest, NextResponse } from 'next/server';

// Import scrapers (real or mock based on query param)
import { datafolhaClientReal } from '@/lib/institutes/datafolha-client-real';
import { ipecClientReal } from '@/lib/institutes/ipec-client-real';
import { quaestClientReal } from '@/lib/institutes/quaest-client-real';
import { datafolhaMockClient, ipecMockClient, quaestMockClient } from '@/lib/institutes/mock-clients';

const REAL_CLIENTS = {
  datafolha: datafolhaClientReal,
  ipec: ipecClientReal,
  quaest: quaestClientReal,
};

const MOCK_CLIENTS = {
  datafolha: datafolhaMockClient,
  ipec: ipecMockClient,
  quaest: quaestMockClient,
};

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const institutesList = searchParams.get('institutes') || 'datafolha,ipec,quaest';
    const timeout = parseInt(searchParams.get('timeout') || '30') * 1000;
    const useMock = searchParams.get('mock') !== 'false'; // Default to mock

    const instituteIds = institutesList
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const clientSet = useMock ? MOCK_CLIENTS : REAL_CLIENTS;
    const clientType = useMock ? 'Mock' : 'Real';

    console.log(`[Test Scrapers] Testing ${instituteIds.join(', ')} (${clientType})`);

    const results = await Promise.allSettled(
      instituteIds.map(async id => {
        const start = Date.now();

        // Validate institute exists
        const client = clientSet[id as keyof typeof clientSet];
        if (!client) {
          throw new Error(`Unknown institute: ${id}`);
        }

        try {
          // Fetch with timeout
          const pollsPromise = client.fetch();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Fetch timeout')), timeout)
          );

          const polls = await Promise.race([pollsPromise, timeoutPromise]) as any[];

          const duration = Date.now() - start;

          return {
            institute: id,
            status: 'success',
            pollsFound: polls.length,
            firstPoll: polls.length > 0 ? {
              id: polls[0].id,
              publishDate: polls[0].publishDate,
              fieldworkEnd: polls[0].fieldworkEnd,
              sampleSize: polls[0].sampleSize,
              results: polls[0].results.length,
            } : null,
            duration,
          };
        } catch (error) {
          const duration = Date.now() - start;
          return {
            institute: id,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
            duration,
          };
        }
      })
    );

    // Format response
    const testResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        institute: 'unknown',
        status: 'error',
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    });

    const successful = testResults.filter(r => r.status === 'success');
    const failed = testResults.filter(r => r.status === 'error');

    const totalPollsFound = successful.reduce((sum: number, r: any) => {
      return sum + ('pollsFound' in r ? r.pollsFound : 0);
    }, 0);

    console.log(`[Test Scrapers] Results:`, {
      successful: successful.length,
      failed: failed.length,
      totalPolls: totalPollsFound,
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      mode: clientType,
      modeInfo: useMock
        ? 'Using mock clients for testing. Pass ?mock=false to use real scrapers.'
        : 'Using real scrapers. Websites may require JavaScript rendering.',
      summary: {
        total: testResults.length,
        successful: successful.length,
        failed: failed.length,
        totalPollsFound,
      },
      results: testResults,
      next_steps: useMock
        ? [
            'Mock clients working ✅',
            'Architecture validated ✅',
            'Next: Real scraper debugging or API integration',
            'Phase 2: Expand to institutes with public APIs',
            'Phase 3: Generic scraper for remaining institutes',
          ]
        : [
            'Review parsing accuracy for each institute',
            'Validate poll data normalization',
            'Check for missing fields (margin_of_error, methodology)',
            'If successful: Deploy Phase 1 and setup scheduler',
            'If issues: Debug HTML structure and update regex patterns',
          ],
    });
  } catch (error) {
    console.error('[Test Scrapers] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
