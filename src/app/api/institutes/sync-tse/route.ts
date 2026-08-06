/**
 * Endpoint: POST /api/institutes/sync-tse
 * Sincroniza dados oficiais do TSE com o banco local
 *
 * Query params:
 *   - election_id: UUID da eleição (obrigatório)
 *   - turno: 1 | 2 (default: 1)
 *   - dry_run: true (preview sem salvar)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('election_id');
    const turno = parseInt(searchParams.get('turno') || '1') as 1 | 2;
    const dryRun = searchParams.get('dry_run') === 'true';

    if (!electionId) {
      return NextResponse.json(
        { error: 'election_id parameter required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get election info
    const { data: election } = await supabase
      .from('elections')
      .select('id, name')
      .eq('id', electionId)
      .single();

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // Get candidates for this election
    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, name')
      .eq('election_id', electionId)
      .eq('is_active', true);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No active candidates found for election' },
        { status: 400 }
      );
    }

    // TODO: Fetch TSE data via TSEResultadosClient
    // For now, return ready-to-implement message

    return NextResponse.json({
      status: 'ready',
      message: 'TSE sync endpoint ready for implementation',
      election: { id: election.id, name: election.name },
      candidates_count: candidates.length,
      turno,
      dry_run: dryRun,
      next_steps: [
        'Call TSE Resultados API via tseResultadosClient',
        'Extract official vote counts and percentages',
        'Map to poll_results table',
        'Mark as is_verified: true (official source)',
        'Recalculate weighted averages'
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('TSE sync error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
