import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { debugBloqueado } from '@/lib/debug-guard';

export async function GET(request: NextRequest) {
  const bloqueio = debugBloqueado(request);
  if (bloqueio) return bloqueio;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: institutes, error } = await supabase
      .from('institutes')
      .select('id, name, reliability_score, slug')
      .order('reliability_score', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      total: institutes?.length || 0,
      institutes: institutes || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
