import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Query information schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error || !data) {
      // Alternative: try to list from multiple known tables
      const tables: string[] = [];
      const tablesToCheck = [
        'elections', 'polls', 'poll_results', 'candidates',
        'polling_institutes', 'institutes', 'institute_credibility',
        'poll_metadata'
      ];

      for (const table of tablesToCheck) {
        const { data: result } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        if (result !== null) {
          tables.push(table);
        }
      }

      return NextResponse.json({ available_tables: tables });
    }

    return NextResponse.json({
      tables: data.map((t: any) => t.table_name),
      error: error?.message
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
