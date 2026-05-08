import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface PollRow {
  id: string;
  fieldwork_end: string;
  sample_size: number;
  methodology: string;
  institute_reliability: number;
}

interface ResultRow {
  candidate_id: string;
  percentage: number;
}

const METHODOLOGY_WEIGHTS: Record<string, number> = {
  presencial: 1.0,
  telefonica: 0.85,
  mista: 0.75,
  online: 0.6,
};

function calculateWeightedAverage(
  polls: (PollRow & { results: ResultRow[] })[],
  candidateId: string,
  referenceDate: Date,
  halfLifeDays: number = 10,
) {
  let weightedSum = 0;
  let totalWeight = 0;
  let pollCount = 0;
  let totalSampleSize = 0;
  const values: { pct: number; weight: number }[] = [];

  for (const poll of polls) {
    const result = poll.results.find((r) => r.candidate_id === candidateId);
    if (!result) continue;

    const daysOld =
      (referenceDate.getTime() - new Date(poll.fieldwork_end).getTime()) /
      86400000;
    const recencyWeight = Math.pow(0.5, Math.max(0, daysOld) / halfLifeDays);
    const sampleWeight = Math.sqrt(poll.sample_size / 1000);
    const methodWeight = METHODOLOGY_WEIGHTS[poll.methodology] ?? 0.5;
    const instituteWeight = poll.institute_reliability || 0.7;
    const finalWeight =
      recencyWeight * sampleWeight * methodWeight * instituteWeight;

    weightedSum += result.percentage * finalWeight;
    totalWeight += finalWeight;
    totalSampleSize += poll.sample_size;
    pollCount++;
    values.push({ pct: result.percentage, weight: finalWeight });
  }

  if (totalWeight === 0) return null;

  const average = weightedSum / totalWeight;
  let varianceSum = 0;
  for (const v of values) {
    varianceSum += v.weight * Math.pow(v.pct - average, 2);
  }
  const stdDev = Math.sqrt(varianceSum / totalWeight);

  return {
    weighted_average: Math.round(average * 10) / 10,
    confidence_interval_low:
      Math.round(Math.max(0, average - 1.96 * stdDev) * 10) / 10,
    confidence_interval_high:
      Math.round(Math.min(100, average + 1.96 * stdDev) * 10) / 10,
    polls_included: pollCount,
    total_sample_size: totalSampleSize,
  };
}

async function recalculateForElection(
  supabase: ReturnType<typeof createClient>,
  electionId: string,
  keepHistory: boolean,
) {
  const { data: election } = await supabase
    .from("elections")
    .select("id, name, election_date")
    .eq("id", electionId)
    .single();

  if (!election) return { error: "Election not found", electionId };

  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name")
    .eq("election_id", electionId)
    .eq("is_active", true);

  if (!candidates?.length) return { error: "No candidates", electionId };

  const { data: polls } = await supabase
    .from("polls")
    .select(`
      id, fieldwork_end, sample_size, methodology,
      institute:institutes(reliability_score),
      results:poll_results(candidate_id, percentage)
    `)
    .eq("election_id", electionId)
    .order("publication_date", { ascending: false });

  if (!polls?.length) return { error: "No polls", electionId };

  const referenceDate = election.election_date
    ? new Date(election.election_date)
    : new Date();

  const enrichedPolls = polls.map((p: any) => ({
    ...p,
    institute_reliability: p.institute?.reliability_score ?? 0.7,
  }));

  // FIX: snapshot mode (default) — limpa entradas anteriores antes de inserir.
  // Antes, o upsert usava (election_id, candidate_id, calculated_at) como
  // conflict target — como calculated_at é sempre `now()`, nunca colidia,
  // poluindo a tabela com duplicatas a cada chamada.
  if (!keepHistory) {
    const { error: delErr } = await supabase
      .from("weighted_averages")
      .delete()
      .eq("election_id", electionId);
    if (delErr) return { error: "Failed to clear old: " + delErr.message, electionId };
  }

  const now = new Date().toISOString();
  const rows: any[] = [];
  const summary: any[] = [];

  for (const cand of candidates) {
    const avg = calculateWeightedAverage(enrichedPolls, cand.id, referenceDate);
    if (!avg) continue;
    rows.push({
      election_id: electionId,
      candidate_id: cand.id,
      calculated_at: now,
      ...avg,
      calculation_params: {
        half_life: 10,
        reference_date: referenceDate.toISOString(),
      },
    });
    summary.push({ candidate: cand.name, ...avg });
  }

  if (rows.length === 0) {
    return { election: election.name, results: [], note: "No candidates with valid weighted average" };
  }

  const { error: insErr } = await supabase.from("weighted_averages").insert(rows);
  if (insErr) return { error: "Insert failed: " + insErr.message, electionId };

  return { election: election.name, count: rows.length, results: summary, timestamp: now };
}

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const electionId = url.searchParams.get("election_id");
    const allFlag = url.searchParams.get("all");
    const keepHistory = url.searchParams.get("keep_history") === "true";

    // Modo "all" — recalcula todas as eleições ativas com pelo menos uma poll.
    if (allFlag === "true") {
      const { data: pollElections } = await supabase
        .from("polls")
        .select("election_id")
        .order("election_id");
      const uniqIds = Array.from(
        new Set((pollElections ?? []).map((p: any) => p.election_id as string)),
      );
      const out: any[] = [];
      for (const id of uniqIds) {
        out.push(await recalculateForElection(supabase, id, keepHistory));
      }
      return new Response(
        JSON.stringify({
          success: true,
          mode: "all",
          elections_processed: out.length,
          results: out,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    if (!electionId) {
      return new Response(
        JSON.stringify({
          error:
            "election_id obrigatório (use ?election_id=... ou ?all=true). Adicione &keep_history=true para preservar snapshots anteriores.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await recalculateForElection(
      supabase,
      electionId,
      keepHistory,
    );

    return new Response(
      JSON.stringify({ success: !result.error, ...result }),
      {
        status: result.error ? 404 : 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
