import { createClient } from "@/lib/supabase/server";
import { authenticate, applyRateLimitHeaders } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import { AveragesQuerySchema } from "@/lib/validation/api-schemas";
import { z } from "zod";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);

  // Validar query parameters com Zod
  let params: z.infer<typeof AveragesQuerySchema>;
  try {
    params = AveragesQuerySchema.parse({
      election_id: searchParams.get("election_id"),
      scenario: searchParams.get("scenario"),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: error instanceof z.ZodError ? error.issues : [] },
      { status: 400 }
    );
  }

  const { election_id: electionId, scenario: scenarioParam } = params;

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
