import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

interface TableCheckResult {
  exists: boolean;
  fields?: string[];
  row_count?: number;
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Check multiple tables
    const tables = [
      'elections',
      'polls',
      'candidates',
      'poll_results',
      'polling_institutes',
      'institutes',
      'institute_credibility',
      'institute_scores'
    ];

    const result: Record<string, TableCheckResult> = {};

    for (const table of tables) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .limit(1);

      if (!error && data) {
        result[table] = {
          exists: true,
          fields: Object.keys(data[0] || {}),
          row_count: count || 0
        };
      } else if (error?.code === '42P01') {
        result[table] = { exists: false };
      }
    }

    // Also check polls with full fields
    const { data: pollSample } = await supabase
      .from('polls')
      .select('*')
      .limit(1);

    return NextResponse.json({
      tables: result,
      poll_sample: pollSample?.[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
