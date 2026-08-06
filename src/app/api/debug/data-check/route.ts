import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const [elections, polls, candidates, results] = await Promise.all([
      supabase.from('elections').select('id, name', { count: 'exact' }),
      supabase.from('polls').select('id, election_id', { count: 'exact' }),
      supabase.from('candidates').select('id, name', { count: 'exact' }),
      supabase.from('poll_results').select('id', { count: 'exact' }),
    ]);

    // Get sample election with polls
    const { data: sampleElection } = await supabase
      .from('elections')
      .select('id, name')
      .limit(1)
      .single();

    let samplePollsCount = 0;
    let sampleElectionId = null;

    if (sampleElection) {
      sampleElectionId = sampleElection.id;
      const { count } = await supabase
        .from('polls')
        .select('id', { count: 'exact', head: true })
        .eq('election_id', sampleElection.id);
      samplePollsCount = count || 0;
    }

    return NextResponse.json({
      database_status: 'OK',
      counts: {
        elections: elections.count || 0,
        polls: polls.count || 0,
        candidates: candidates.count || 0,
        poll_results: results.count || 0,
      },
      sample: {
        election_id: sampleElectionId,
        election_name: sampleElection?.name,
        polls_in_sample: samplePollsCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
