/**
 * Endpoint: POST /api/institutes/sync-datafolha
 * Sincroniza pesquisas da Datafolha com o banco local
 *
 * Query params:
 *   - election_id: UUID da eleição (obrigatório)
 *   - dry_run: true (preview sem salvar)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const DATAFOLHA_INSTITUTE_ID = '38744dae-cbdf-4ed1-84f9-ada191886146';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('election_id');
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

    // TODO: Fetch Datafolha data
    // For now, return ready-to-implement message

    return NextResponse.json({
      status: 'ready',
      message: 'Datafolha sync endpoint ready for implementation',
      election: { id: election.id, name: election.name },
      candidates_count: candidates.length,
      institute_id: DATAFOLHA_INSTITUTE_ID,
      dry_run: dryRun,
      next_steps: [
        'Call Datafolha API via datafolhaClient',
        'Map results to poll_results table',
        'Insert/update polls with data',
        'Recalculate weighted averages'
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Datafolha sync error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
