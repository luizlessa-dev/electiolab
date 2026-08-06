import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get('election_id');

  if (!electionId) {
    return NextResponse.json({ error: 'election_id required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: election, error: eError } = await supabase
      .from('elections')
      .select('id, name')
      .eq('id', electionId)
      .single();

    const { data: candidates, error: cError } = await supabase
      .from('candidates')
      .select('id, name')
      .eq('election_id', electionId)
      .eq('is_active', true);

    const { data: polls, error: pError } = await supabase
      .from('polls')
      .select(`
        id,
        fieldwork_end,
        sample_size,
        methodology,
        credibility_score,
        margin_of_error,
        poll_results(candidate_id, percentage)
      `)
      .eq('election_id', electionId)
      .limit(3);

    return NextResponse.json({
      election: { found: !!election, data: election, error: eError?.message },
      candidates: { count: candidates?.length || 0, error: cError?.message },
      polls: {
        count: polls?.length || 0,
        sample: polls?.[0],
        error: pError?.message
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
