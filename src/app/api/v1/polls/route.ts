import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get("election_id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  const supabase = await createClient();

  let query = supabase
    .from("polls")
    .select(`
      id, election_id, fieldwork_start, fieldwork_end, publication_date,
      sample_size, margin_of_error, methodology, scope, poll_type,
      institute:institutes(id, name),
      results:poll_results(candidate_id, percentage, candidate:candidates(name, party))
    `)
    .order("publication_date", { ascending: false })
    .limit(limit);

  if (electionId) {
    query = query.eq("election_id", electionId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count: data.length });
}
