import { NextRequest, NextResponse } from 'next/server';
import { aggregateStatePolls } from '@/lib/aggregation/state-aggregation';
import { getMockStateClient } from '@/lib/institutes/mock-state-clients';
import { supabase } from '@/lib/supabase/client';
import { getOrchestrator } from '@/lib/services/wave4-orchestrator';
import { handleError, successResponse } from '@/lib/utils/error-handler';
import { validateApiKey, checkRateLimit, getClientIdentifier } from '@/lib/middleware/auth';

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const POSITIONS: Array<'governador' | 'senador'> = ['governador', 'senador'];

/**
 * Cron Job: Record Daily Aggregation Snapshots
 *
 * This endpoint should be called once daily (e.g., via Vercel Cron)
 * to record snapshots of all aggregations for historical tracking.
 *
 * Configure in vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/aggregation-snapshots",
 *       "schedule": "0 0 * * *"
 *     }
 *   ]
 * }
 *
 * Or trigger manually:
 * curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *   https://your-domain/api/cron/aggregation-snapshots
 */

async function recordSnapshots() {
  try {
    const referenceDate = new Date();
    const candidates: Array<{
      name: string;
      state: string;
      position: 'governador' | 'senador' | 'presidencial';
      percentage: number;
      confidence: number;
    }> = [];

    for (const state of STATES) {
      for (const position of POSITIONS) {
        try {
          // Fetch real polls, same pattern as /api/polls/anomalies
          let polls: any[] = [];

          try {
            const { data, error } = await supabase
              .from('polls')
              .select('*')
              .eq('state', state)
              .eq('position', position)
              .order('published_at', { ascending: false });

            if (!error && data) {
              polls = data;
            }
          } catch {
            console.warn(`[Cron] Failed to fetch ${state} ${position} from Supabase`);
          }

          // Fallback to mock institute data when no real polls are stored yet
          if (polls.length === 0) {
            const mockClient = getMockStateClient(state, 'quaest');
            if (mockClient) {
              const mockPolls = await mockClient.fetch();
              polls = mockPolls.flatMap(poll =>
                poll.results.map(result => ({
                  candidate_name: result.candidateName,
                  percentage: result.percentage,
                  margin_of_error: poll.marginOfError,
                  institute_name: poll.instituteName,
                  published_at: poll.publishDate.toISOString(),
                  sample_size: poll.sampleSize,
                }))
              );
            }
          }

          if (polls.length === 0) continue;

          const aggregationData = polls.map(poll => ({
            candidateName: poll.candidate_name,
            percentage: poll.percentage,
            marginOfError: poll.margin_of_error,
            publishDate: new Date(poll.published_at),
            instituteName: poll.institute_name,
            sampleSize: poll.sample_size,
          }));

          const result = aggregateStatePolls(aggregationData, state, position, referenceDate);

          for (const candidate of result.candidates) {
            candidates.push({
              name: candidate.name,
              state,
              position,
              percentage: candidate.weightedPercentage,
              confidence: candidate.confidence,
            });
          }
        } catch (err) {
          console.warn(`[Cron] Error aggregating ${state} ${position}:`, err);
        }
      }
    }

    if (candidates.length === 0) {
      console.log('[Cron] Aggregation snapshots: no poll data available to record');
      return {
        success: true,
        message: 'No poll data available to record',
        recordedCount: 0,
        timestamp: referenceDate.toISOString(),
      };
    }

    const snapshot = await getOrchestrator().handlePeriodicSnapshot(candidates, 'cron');

    console.log(`[Cron] Aggregation snapshots recorded: ${snapshot.candidateCount} state/position group(s)`);

    return {
      success: true,
      message: 'Cron job executed successfully',
      recordedCount: snapshot.candidateCount,
      timestamp: snapshot.timestamp,
    };
  } catch (error) {
    console.error('Error in snapshot cron job:', error);
    throw error;
  }
}

/**
 * GET endpoint - Trigger snapshot recording
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const isValid = validateApiKey(request);
    if (!isValid && process.env.WAVE4_API_KEY) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, 10, 3600000); // 10 calls per hour

    if (!rateLimit.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        }),
        { status: 429 }
      );
    }

    const result = await recordSnapshots();
    return successResponse(result, 200, {
      'X-RateLimit-Remaining': String(rateLimit.remaining),
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST endpoint - Alternative trigger
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
