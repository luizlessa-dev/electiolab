import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Try different table names
    const tableNames = ['polling_institutes', 'institutes', 'institute'];
    let institutes = null;
    let usedTable = null;

    for (const table of tableNames) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(5);

      if (!error && data && data.length > 0) {
        institutes = data;
        usedTable = table;
        break;
      }
    }

    if (!institutes) {
      // If no institutes table, fetch from polls and get unique institute_ids
      const { data: polls } = await supabase
        .from('polls')
        .select('institute_id')
        .limit(10);

      const instituteIds = [...new Set(polls?.map(p => p.institute_id))];

      return NextResponse.json({
        message: 'No institutes table found, but found institute_ids in polls',
        sample_institute_ids: instituteIds,
        count: instituteIds.length,
      });
    }

    return NextResponse.json({
      table: usedTable,
      count: institutes.length,
      sample: institutes[0],
      fields: Object.keys(institutes[0] || {}),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
