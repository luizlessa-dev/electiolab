import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get one poll to see all fields
    const { data: polls, error } = await supabase
      .from('polls')
      .select('*')
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!polls || polls.length === 0) {
      return NextResponse.json({ message: 'No polls found' });
    }

    const poll = polls[0];
    const fields = Object.keys(poll);

    return NextResponse.json({
      fields,
      sample_poll: poll,
      has_credibility_score: 'credibility_score' in poll,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
