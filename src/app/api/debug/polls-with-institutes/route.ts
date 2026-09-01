import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { debugBloqueado } from '@/lib/debug-guard';

export async function GET(request: NextRequest) {
  const bloqueio = debugBloqueado(request);
  if (bloqueio) return bloqueio;

  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get('election_id') || '2a8761ab-9dc0-4436-8682-4095c0b7f014';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Try different JOIN syntaxes
    const { data, error } = await supabase
      .from('polls')
      .select(`
        id,
        institute_id,
        institutes(id, name, reliability_score),
        poll_results(candidate_id, percentage)
      `)
      .eq('election_id', electionId)
      .limit(2);

    return NextResponse.json({
      error: error?.message,
      count: data?.length || 0,
      sample: data?.[0],
      institutes_field_exists: data && data[0] && 'institutes' in data[0],
      all_fields: data && data[0] ? Object.keys(data[0]) : [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
