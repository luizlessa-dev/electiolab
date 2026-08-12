/**
 * GET /api/approval/aggregated
 *
 * Get approval ratings for presidential or governor positions
 *
 * Query parameters:
 * - position: presidencial|governador (required)
 * - uf: UF code (required for governador, ignored for presidencial)
 * - days: 7|14|30|90 (default: 30)
 *
 * Reads the production `approval_polls` table, which stores one row per
 * metric ('binary' | 'rating' | 'rejection') per subject per poll. Approval/
 * disapproval comes from `metric = 'binary'` rows (pct_aprova/pct_desaprova).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/admin';
import { approvalAggregation, type ApprovalPoll } from '@/lib/approval/approval-aggregation';

const OFFICE_BY_POSITION: Record<'presidencial' | 'governador', string> = {
  presidencial: 'presidente',
  governador: 'governador',
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const position = searchParams.get('position');
    const uf = searchParams.get('uf');
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Validation
    if (!position || !['presidencial', 'governador'].includes(position)) {
      return NextResponse.json(
        { error: 'position parameter required (presidencial|governador)' },
        { status: 400 }
      );
    }

    if (position === 'governador' && !uf) {
      return NextResponse.json({ error: 'uf parameter required for governador' }, { status: 400 });
    }

    const referenceDate = new Date();
    const startDate = new Date(referenceDate.getTime() - days * 24 * 60 * 60 * 1000);
    const scope = position === 'presidencial' ? 'nacional' : uf!;

    // Fetch approval polls from database
    const { data, error } = await supabase
      .from('approval_polls')
      .select('*')
      .eq('office', OFFICE_BY_POSITION[position as 'presidencial' | 'governador'])
      .eq('scope', scope)
      .eq('metric', 'binary')
      .gte('publication_date', startDate.toISOString().slice(0, 10))
      .lte('publication_date', referenceDate.toISOString().slice(0, 10))
      .order('publication_date', { ascending: false });

    if (error) {
      console.error('[Approval] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch approval data' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: 'No approval data found for this position/scope' },
        { status: 404 }
      );
    }

    // Convert to ApprovalPoll format
    const polls: ApprovalPoll[] = data.map(row => ({
      candidateName: row.subject_label,
      approval: Number(row.pct_aprova) || 0,
      disapproval: Number(row.pct_desaprova) || 0,
      neutral: Number(row.pct_nsnr) || 0,
      marginOfError: Number(row.margin_of_error) || 2.5,
      instituteName: row.institute_name || 'Unknown',
      publishDate: new Date(row.publication_date),
      sampleSize: row.sample_size || 2000,
    }));

    // Aggregate
    const result = approvalAggregation.aggregateApprovalPolls(
      polls,
      position === 'governador' ? uf || undefined : undefined,
      position as any,
      referenceDate
    );

    return NextResponse.json(
      {
        position,
        state: uf || null,
        period: days,
        referenceDate: referenceDate.toISOString(),
        approval: {
          percentage: result.approval,
          confidence: result.confidence,
          trend: result.trend,
          trendMagnitude: result.trendMagnitude,
        },
        disapproval: {
          percentage: result.disapproval,
        },
        neutral: {
          percentage: result.neutral,
        },
        samplesUsed: result.samplesUsed,
        institutes: [...new Set(polls.map(p => p.instituteName))],
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error) {
    console.error('[Approval] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
