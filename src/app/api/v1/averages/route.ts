import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get("election_id");

  const supabase = await createClient();

  let query = supabase
    .from("weighted_averages")
    .select(`
      id, election_id, candidate_id, calculated_at,
      weighted_average, confidence_interval_low, confidence_interval_high,
      polls_included, total_sample_size,
      candidate:candidates(name, party, color, number)
    `)
    .order("weighted_average", { ascending: false });

  if (electionId) {
    query = query.eq("election_id", electionId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count: data.length });
}
