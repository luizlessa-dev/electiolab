/**
 * GET /api/polls/aggregated
 *
 * Query params:
 * - uf: string (required, 2 letters)
 * - days: number (1-90, default 7)
 * - candidate: string (optional, filter by candidate)
 *
 * Returns: Weighted poll aggregation with confidence scores
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aggregateWeightedPolls } from '@/lib/aggregation/poll-weighting';
import type { Poll } from '@/lib/institutes/institute-client-base';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface AggregatedResponse {
  candidates: Array<{
    name: string;
    weightedPercentage: number;
    confidence: number;
    samplesUsed: number;
  }>;
  metadata: {
    aggregatedAt: string;
    totalSamplesProcessed: number;
    outliersRemoved: number;
    methodology: string;
    period: {
      startDate: string;
      endDate: string;
      days: number;
    };
  };
  timestamp: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uf = searchParams.get('uf')?.toUpperCase();
    const daysStr = searchParams.get('days') || '7';
    const candidateFilter = searchParams.get('candidate');

    // Validate UF
    if (!uf || !/^[A-Z]{2}$/.test(uf)) {
      return NextResponse.json(
        { error: 'Invalid UF. Must be 2 uppercase letters (e.g., SP, RJ)' },
        { status: 400 }
      );
    }

    // Validate days
    const days = parseInt(daysStr);
    if (isNaN(days) || days < 1 || days > 90) {
      return NextResponse.json(
        { error: 'Invalid days. Must be between 1 and 90' },
        { status: 400 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch polls from Supabase
    let query = supabase
      .from('polls')
      .select('*')
      .gte('publication_date', startDate.toISOString())
      .lte('publication_date', endDate.toISOString());

    const { data: pollsData, error: dbError } = await query;

    if (dbError) {
      console.error('[Aggregated] Supabase error:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch polls from database' },
        { status: 500 }
      );
    }

    if (!pollsData || pollsData.length === 0) {
      return NextResponse.json(
        {
          candidates: [],
          metadata: {
            aggregatedAt: new Date().toISOString(),
            totalSamplesProcessed: 0,
            outliersRemoved: 0,
            methodology: 'Weighted aggregation (MoE + Recency + Outlier detection)',
            period: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              days,
            },
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Transform Supabase data to Poll format
    const polls: Array<Poll & { marginOfError?: number }> = pollsData.map((p: any) => ({
      id: p.id,
      instituteId: p.institute_id,
      instituteName: p.institute_id,
      publishDate: new Date(p.publication_date),
      fieldworkEnd: new Date(p.fieldwork_end),
      fieldworkStart: p.fieldwork_start ? new Date(p.fieldwork_start) : undefined,
      sampleSize: p.sample_size || 0,
      marginOfError: p.margin_of_error,
      confidenceLevel: p.confidence_level || 95,
      methodology: p.methodology || 'unknown',
      results: (p.raw_data?.results || []).map((r: any) => ({
        candidateId: r.candidateId,
        candidateName: r.candidateName,
        percentage: r.percentage,
      })),
      sourceUrl: p.source_url,
      isVerified: p.is_verified || false,
      reliabilityScore: 0.7,
    }));

    // Filter by candidate if specified
    let filteredPolls = polls;
    if (candidateFilter) {
      filteredPolls = polls.filter((p) =>
        p.results.some(
          (r) =>
            r.candidateName
              .toLowerCase()
              .includes(candidateFilter.toLowerCase()) ||
            candidateFilter.toLowerCase().includes(r.candidateName.toLowerCase())
        )
      );
    }

    if (filteredPolls.length === 0) {
      return NextResponse.json(
        {
          candidates: [],
          metadata: {
            aggregatedAt: new Date().toISOString(),
            totalSamplesProcessed: 0,
            outliersRemoved: 0,
            methodology: 'Weighted aggregation (MoE + Recency + Outlier detection)',
            period: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              days,
            },
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Flatten all results for aggregation
    const allResults: Array<{
      candidateName: string;
      percentage: number;
      marginOfError?: number;
      publishDate: Date;
    }> = [];

    filteredPolls.forEach((poll) => {
      poll.results.forEach((result) => {
        allResults.push({
          candidateName: result.candidateName,
          percentage: result.percentage,
          marginOfError: poll.marginOfError,
          publishDate: poll.publishDate,
        });
      });
    });

    // Aggregate
    const aggregated = aggregateWeightedPolls(allResults, endDate);

    // Count outliers (simple heuristic)
    const outlierThreshold = 2;
    const outliersRemoved = allResults.filter((r) => {
      const mean =
        allResults
          .filter((x) => x.candidateName === r.candidateName)
          .reduce((sum, x) => sum + x.percentage, 0) /
        allResults.filter((x) => x.candidateName === r.candidateName).length;

      const stdDev = Math.sqrt(
        allResults
          .filter((x) => x.candidateName === r.candidateName)
          .reduce((sum, x) => sum + Math.pow(x.percentage - mean, 2), 0) /
          allResults.filter((x) => x.candidateName === r.candidateName).length
      );

      return Math.abs(r.percentage - mean) > outlierThreshold * stdDev;
    }).length;

    // Map to response format
    const candidates = aggregated.map((a) => ({
      name: a.candidateName,
      weightedPercentage: a.weightedPercentage,
      confidence: a.confidence,
      samplesUsed: a.samplesUsed,
    }));

    const response: AggregatedResponse = {
      candidates,
      metadata: {
        aggregatedAt: new Date().toISOString(),
        totalSamplesProcessed: allResults.length,
        outliersRemoved,
        methodology:
          'Weighted aggregation with Margin of Error weighting, recency decay (14-day half-life), and 2-sigma outlier detection',
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[Aggregated] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
