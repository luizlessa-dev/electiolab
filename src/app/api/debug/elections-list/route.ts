import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get unique election IDs from polls
    const { data: polls, error: e1 } = await supabase
      .from('polls')
      .select('election_id');

    console.log('Polls query result:', { count: polls?.length, error: e1?.message });

    if (!polls || polls.length === 0) {
      return NextResponse.json({
        error: 'No polls found',
        query_error: e1?.message,
      });
    }

    const uniqIds = Array.from(
      new Set(polls.map((p: any) => p.election_id as string).filter(Boolean))
    );

    console.log('Unique election IDs:', uniqIds);

    // Try to fetch each election
    const elections: any[] = [];
    for (const eId of uniqIds.slice(0, 3)) {
      const { data: election, error: eError } = await supabase
        .from('elections')
        .select('id, name')
        .eq('id', eId)
        .single();

      console.log(`Election ${eId}:`, { found: !!election, error: eError?.message });

      if (election) {
        elections.push(election);
      }
    }

    return NextResponse.json({
      polls_count: polls.length,
      unique_election_ids: uniqIds,
      elections_found: elections.length,
      sample_elections: elections,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
