/**
 * GET /api/regions/aggregated
 * POST /api/regions/aggregated/batch
 *
 * Get aggregated polls by region
 *
 * Query parameters:
 * - region: sul|sudeste|centro-oeste|nordeste|norte
 * - position: governador|senador|presidencial
 * - days: 7|14|30|90 (default: 30)
 */

import { NextRequest, NextResponse } from 'next/server';
import { aggregateStatePolls } from '@/lib/aggregation/state-aggregation';
import { regionalAggregation, REGIONS, type Region } from '@/lib/aggregation/regional-aggregation';
import { getMockStateClient } from '@/lib/institutes/mock-state-clients';
import { supabase } from '@/lib/supabase/client';

interface RegionAggregationRequest {
  regions?: Region[]
  position: 'governador' | 'senador' | 'presidencial'
  days?: number
}

/**
 * Row shape fetched from `polls` (Supabase client here is untyped — see
 * src/lib/supabase/client.ts) or synthesized from the mock institute
 * fallback further below. Both branches share this shape.
 */
interface StatePollRow {
  state: string;
  position: 'governador' | 'senador' | 'presidencial';
  candidate_name: string;
  percentage: number;
  margin_of_error?: number;
  institute_name: string;
  published_at: string;
  sample_size: number;
}

/**
 * GET - Single region
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const regionParam = searchParams.get('region');
    const position = (searchParams.get('position') || 'governador') as 'governador' | 'senador' | 'presidencial';
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!regionParam || !Object.keys(REGIONS).includes(regionParam)) {
      return NextResponse.json(
        {
          error: 'region parameter required',
          availableRegions: Object.keys(REGIONS),
        },
        { status: 400 }
      );
    }

    const region = regionParam as Region;
    const states = REGIONS[region].states;
    const referenceDate = new Date();
    const startDate = new Date(referenceDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Aggregate each state in the region
    const stateResults = [];

    for (const state of states) {
      try {
        // Fetch from database
        let polls: StatePollRow[] = [];

        try {
          const { data, error } = await supabase
            .from('polls')
            .select('*')
            .eq('state', state)
            .eq('position', position)
            .gte('published_at', startDate.toISOString())
            .lte('published_at', referenceDate.toISOString());

          if (!error && data) {
            polls = data;
          }
        } catch {
          console.warn(`[Regional] Failed to fetch ${state} from DB`);
        }

        // Fallback to mock
        if (polls.length === 0) {
          const mockClient = getMockStateClient(state, 'quaest');
          if (mockClient) {
            const mockPolls = await mockClient.fetch();
            polls = mockPolls.flatMap(poll =>
              poll.results.map(result => ({
                state,
                position,
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

        // Aggregate state
        const aggregationData = polls.map(poll => ({
          candidateName: poll.candidate_name,
          percentage: poll.percentage,
          marginOfError: poll.margin_of_error,
          publishDate: new Date(poll.published_at),
          instituteName: poll.institute_name,
          sampleSize: poll.sample_size,
        }));

        // Only aggregate for gubernatorial and senatorial positions at state level
        if (position !== 'presidencial') {
          const stateResult = aggregateStatePolls(aggregationData, state, position as 'governador' | 'senador', referenceDate);

          stateResults.push({
            state,
            position: position as 'governador' | 'senador',
            candidates: stateResult.candidates.map(c => ({
              name: c.name,
              party: c.party,
              percentage: c.weightedPercentage,
              confidence: c.confidence,
              samplesUsed: c.samplesUsed,
            })),
          });
        }
      } catch (err) {
        console.warn(`[Regional] Error processing ${state}:`, err);
      }
    }

    // Aggregate by region
    const regionalResult = regionalAggregation.aggregateRegion(stateResults, region, position, referenceDate);

    return NextResponse.json(
      {
        region: regionalResult.regionName,
        regionCode: region,
        position,
        period: days,
        referenceDate: referenceDate.toISOString(),
        coverage: {
          statesCovered: regionalResult.qualityMetrics.statesCovered,
          totalStates: regionalResult.qualityMetrics.totalStates,
          coverage: `${Math.round(regionalResult.qualityMetrics.coverageRatio * 100)}%`,
        },
        candidates: regionalResult.candidates.map(c => ({
          name: c.name,
          party: c.party,
          percentage: c.percentage,
          confidence: c.confidence,
          statesWithData: c.statesWithData,
          statesCount: c.statesCount,
        })),
        qualityMetrics: {
          averageConfidence: Math.round(regionalResult.qualityMetrics.averageConfidence * 100) / 100,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error) {
    console.error('[Regional] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Multiple regions
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegionAggregationRequest;
    const { regions, position, days = 30 } = body;

    if (!regions || !Array.isArray(regions) || regions.length === 0) {
      return NextResponse.json({ error: 'regions array required' }, { status: 400 });
    }

    const validRegions = regions.filter(r => Object.keys(REGIONS).includes(r));

    if (validRegions.length === 0) {
      return NextResponse.json({ error: 'no valid regions provided' }, { status: 400 });
    }

    const referenceDate = new Date();
    const results = [];

    for (const region of validRegions) {
      // Use GET logic
      const searchParams = new URLSearchParams({
        region,
        position,
        days: days.toString(),
      });

      const subRequest = new NextRequest(
        `${new URL(request.url).origin}/api/regions/aggregated?${searchParams.toString()}`
      );

      const response = await GET(subRequest);
      const data = await response.json();

      if (response.ok) {
        results.push(data);
      }
    }

    // Compare regions
    const comparison = regionalAggregation.compareRegions(
      results.map(r => ({
        region: r.regionCode as Region,
        result: {
          region: r.regionCode,
          regionName: r.region,
          states: REGIONS[r.regionCode as Region].states,
          position,
          period: days,
          candidates: r.candidates,
          qualityMetrics: {
            statesCovered: r.coverage.statesCovered,
            totalStates: r.coverage.totalStates,
            coverageRatio: r.coverage.statesCovered / r.coverage.totalStates,
            averageConfidence: r.qualityMetrics.averageConfidence,
          },
          aggregatedAt: new Date(r.referenceDate),
        },
      }))
    );

    return NextResponse.json(
      {
        position,
        period: days,
        referenceDate: referenceDate.toISOString(),
        regions: results,
        comparison: {
          commonCandidates: comparison.commonCandidates,
          regionDifferences: comparison.regionDifferences,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error) {
    console.error('[Regional] POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
