import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uf: string }> }
) {
  const { uf } = await params;
  const normalizedUf = uf.toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedUf)) {
    return NextResponse.json({ error: 'UF inválida' }, { status: 400 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('prior_election_results')
      .select('*')
      .eq('year', 2022)
      .eq('state', normalizedUf)
      .eq('election_type', 'governador')
      .order('total_votes', { ascending: false });

    if (error) {
      console.error(`Erro para ${normalizedUf}:`, error.message);
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        state: normalizedUf,
        top_party: null,
        total_votes: 0,
        message: 'Sem dados para este estado',
      });
    }

    const partyVotes = new Map<string, number>();
    for (const row of data) {
      const party = row.party || 'Desconhecido';
      partyVotes.set(party, (partyVotes.get(party) || 0) + (row.total_votes || 0));
    }

    let topParty = 'Desconhecido';
    let topVotes = 0;
    for (const [party, votes] of partyVotes) {
      if (votes > topVotes) {
        topVotes = votes;
        topParty = party;
      }
    }

    return NextResponse.json({
      state: normalizedUf,
      top_party: topParty,
      total_votes: topVotes,
      party_distribution: Object.fromEntries(partyVotes),
      source: 'prior_election_results (2022)',
    });
  } catch (error) {
    console.error(`Erro ao buscar ${normalizedUf}:`, error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
