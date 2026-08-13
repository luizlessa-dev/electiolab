/**
 * GET /api/history/trends
 *
 * Get trend metrics for candidates
 *
 * Query parameters:
 * - state: UF code
 * - position: governador|senador|presidencial (default: governador)
 * - days: 7|14|30|90|180 (default: 90)
 * - candidate: specific candidate (optional, gets all if not provided)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pollHistory } from '@/lib/history/poll-history';

interface CandidateTrendAccumulator {
  name: string;
  party?: string;
  dataPoints: Array<{ date: Date; percentage: number; confidence: number }>;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');
    const position = searchParams.get('position') || 'governador';
    const days = parseInt(searchParams.get('days') || '90', 10);
    const candidateFilter = searchParams.get('candidate');

    if (!state) {
      return NextResponse.json({ error: 'state parameter required' }, { status: 400 });
    }

    const referenceDate = new Date();
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - days);

    if (candidateFilter) {
      // Get trend for specific candidate
      const trend = await pollHistory.getTrendMetrics(
        candidateFilter,
        state,
        position,
        startDate,
        referenceDate
      );

      if (!trend) {
        return NextResponse.json(
          { message: 'No trend data found for candidate' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          candidate: trend.candidate,
          state: trend.state,
          position: trend.position,
          period: days,
          trend_data: {
            startPercentage: Math.round(trend.startPercentage * 10) / 10,
            endPercentage: Math.round(trend.endPercentage * 10) / 10,
            totalChange: Math.round(trend.change * 10) / 10,
            percentChange: Math.round(trend.changePercent * 10) / 10,
          },
          volatility: {
            score: Math.round(trend.volatility * 100) / 100,
            consistency: trend.consistency,
          },
          trend: trend.trend,
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=3600',
          },
        }
      );
    }

    // Get trends for all candidates in the state
    const snapshots = await pollHistory.getSnapshots(state, position, days, 10);

    if (snapshots.length === 0) {
      return NextResponse.json(
        { message: 'No historical data found' },
        { status: 404 }
      );
    }

    // Collect all candidates
    const candidateMap = new Map<string, CandidateTrendAccumulator>();

    for (const snapshot of snapshots) {
      for (const candidate of snapshot.candidates) {
        const key = candidate.name.toLowerCase();
        if (!candidateMap.has(key)) {
          candidateMap.set(key, {
            name: candidate.name,
            party: candidate.party,
            dataPoints: [],
          });
        }
        candidateMap.get(key)!.dataPoints.push({
          date: snapshot.snapshotDate,
          percentage: candidate.percentage,
          confidence: candidate.confidence,
        });
      }
    }

    // Calculate trends for each candidate
    const trends = [];
    for (const [, candidate] of candidateMap) {
      if (candidate.dataPoints.length < 2) continue;

      const percentages = candidate.dataPoints.map((p) => p.percentage);
      const startPct = percentages[0];
      const endPct = percentages[percentages.length - 1];
      const change = endPct - startPct;

      let trend = 'stable';
      if (change > 2) trend = 'up';
      else if (change < -2) trend = 'down';

      const volatility = calculateVolatility(percentages);

      trends.push({
        candidate: candidate.name,
        party: candidate.party,
        startPercentage: Math.round(startPct * 10) / 10,
        endPercentage: Math.round(endPct * 10) / 10,
        totalChange: Math.round(change * 10) / 10,
        volatility: Math.round(volatility * 100) / 100,
        trend,
        dataPoints: candidate.dataPoints.length,
      });
    }

    // Sort by absolute change
    trends.sort((a, b) => Math.abs(b.totalChange) - Math.abs(a.totalChange));

    return NextResponse.json(
      {
        state,
        position,
        period: days,
        snapshotCount: snapshots.length,
        trends,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error) {
    console.error('[Trends] Error:', error);
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
 * Helper methods
 */
function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}
