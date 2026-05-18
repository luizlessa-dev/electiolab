import { createClient } from "@/lib/supabase/server";
import { authenticate, applyRateLimitHeaders } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get("election_id");
  // ?scenario=lula-vs-zema filtra um cenário 2T específico.
  // ?scenario=null (default) retorna só 1T (scenario_label IS NULL).
  // ?scenario=all retorna tudo (1T + todos cenários 2T).
  const scenarioParam = searchParams.get("scenario");

  const supabase = await createClient();

  let query = supabase
    .from("weighted_averages")
    .select(`
      id, election_id, candidate_id, calculated_at, scenario_label,
      weighted_average, confidence_interval_low, confidence_interval_high,
      polls_included, total_sample_size,
      candidate:candidates(name, party, color, number)
    `)
    .order("weighted_average", { ascending: false });

  if (electionId) {
    query = query.eq("election_id", electionId);
  }

  if (scenarioParam === "all") {
    // sem filtro
  } else if (scenarioParam && scenarioParam !== "null") {
    query = query.eq("scenario_label", scenarioParam);
  } else {
    query = query.is("scenario_label", null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return applyRateLimitHeaders(
    NextResponse.json({ data, count: data?.length ?? 0 }),
    auth
  );
}
