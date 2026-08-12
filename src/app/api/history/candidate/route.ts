/**
 * GET /api/history/candidate
 *
 * Get historical data for a specific candidate
 *
 * Query parameters:
 * - candidate: candidate name (required)
 * - state: UF code (required)
 * - position: governador|senador|presidencial
 * - days: 7|14|30|90|180|365 (default: 90)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pollHistory } from '@/lib/history/poll-history';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const candidate = searchParams.get('candidate');
    const state = searchParams.get('state');
    const position = searchParams.get('position') || 'governador';
    const days = parseInt(searchParams.get('days') || '90', 10);

    // Validation
    if (!candidate) {
      return NextResponse.json({ error: 'candidate parameter required' }, { status: 400 });
    }

    if (!state) {
      return NextResponse.json({ error: 'state parameter required' }, { status: 400 });
    }

    // Get trajectory
    const trajectory = await pollHistory.getCandidateHistory(candidate, state, position, days);

    if (!trajectory) {
      return NextResponse.json(
        { message: 'No historical data found for candidate' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        candidate: trajectory.name,
        state,
        position,
        period: days,
        trend: trajectory.trend,
        statistics: {
          averagePercentage: Math.round(trajectory.averagePercentage * 10) / 10,
          totalChange: Math.round(trajectory.totalChange * 10) / 10,
          startPercentage: Math.round(trajectory.history[0].percentage * 10) / 10,
          endPercentage: Math.round(trajectory.history[trajectory.history.length - 1].percentage * 10) / 10,
          dataPoints: trajectory.history.length,
        },
        history: trajectory.history.map(h => ({
          date: h.date.toISOString(),
          percentage: Math.round(h.percentage * 10) / 10,
          confidence: Math.round(h.confidence * 100) / 100,
        })),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error) {
    console.error('[History] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
