/**
 * GET /api/history/comparison
 *
 * Compare polls between two periods
 *
 * Query parameters:
 * - state: UF code (required)
 * - position: governador|senador|presidencial
 * - period1_days: days before reference (e.g., 60-30 = last month)
 * - period2_days: days before reference (e.g., 30-0 = this month)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pollHistory } from '@/lib/history/poll-history';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');
    const position = searchParams.get('position') || 'governador';

    // Parse period parameters
    const period1StartParam = parseInt(searchParams.get('period1_start') || '60', 10);
    const period1EndParam = parseInt(searchParams.get('period1_end') || '30', 10);
    const period2StartParam = parseInt(searchParams.get('period2_start') || '30', 10);
    const period2EndParam = parseInt(searchParams.get('period2_end') || '0', 10);

    if (!state) {
      return NextResponse.json({ error: 'state parameter required' }, { status: 400 });
    }

    const referenceDate = new Date();

    // Calculate period dates
    const period1Start = new Date(referenceDate);
    period1Start.setDate(period1Start.getDate() - period1StartParam);

    const period1End = new Date(referenceDate);
    period1End.setDate(period1End.getDate() - period1EndParam);

    const period2Start = new Date(referenceDate);
    period2Start.setDate(period2Start.getDate() - period2StartParam);

    const period2End = new Date(referenceDate);
    period2End.setDate(period2End.getDate() - period2EndParam);

    // Get comparison
    const comparison = await pollHistory.comparePeriods(
      state,
      position,
      period1Start,
      period1End,
      period2Start,
      period2End
    );

    if (!comparison) {
      return NextResponse.json(
        { message: 'Insufficient data to compare periods' },
        { status: 404 }
      );
    }

    // Format changes (sort by absolute change)
    const changes = comparison.changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return NextResponse.json(
      {
        state,
        position,
        periods: {
          period1: {
            startDate: period1Start.toISOString(),
            endDate: period1End.toISOString(),
            candidates: comparison.period1.map((c: any) => ({
              name: c.name,
              party: c.party,
              percentage: Math.round(c.percentage * 10) / 10,
            })),
          },
          period2: {
            startDate: period2Start.toISOString(),
            endDate: period2End.toISOString(),
            candidates: comparison.period2.map((c: any) => ({
              name: c.name,
              party: c.party,
              percentage: Math.round(c.percentage * 10) / 10,
            })),
          },
        },
        changes: changes.map(c => ({
          candidate: c.name,
          change: c.change,
          changePercent: c.percentChange,
          direction: c.change > 0 ? 'up' : c.change < 0 ? 'down' : 'stable',
        })),
        summary: {
          greatestGain: changes[0],
          greatestLoss: changes[changes.length - 1],
          totalCandidatesCompared: changes.length,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error) {
    console.error('[Comparison] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
