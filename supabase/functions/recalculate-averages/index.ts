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

interface CandidateRow {
  id: string;
  name: string;
  slug: string;
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

/**
 * Para eleições 2T, agrupa polls por par de candidatos (cenário).
 * Cada cenário 2T é uma pergunta INDEPENDENTE — agregar todos como
 * média única é matematicamente errado (mistura "Lula vs A" com "Lula vs B").
 *
 * Retorna Map<scenarioLabel, polls[]> onde label é "{slug_a}-vs-{slug_b}"
 * (slugs ordenados alfabeticamente pra estabilidade).
 */
function groupPollsByScenario(
  polls: (PollRow & { results: ResultRow[] })[],
  candidatesById: Map<string, CandidateRow>,
): Map<string, { polls: typeof polls; candidateIds: [string, string] }> {
  const groups = new Map<string, { polls: typeof polls; candidateIds: [string, string] }>();
  for (const poll of polls) {
    if (poll.results.length !== 2) continue; // 2T válido tem exatamente 2 candidatos
    const [r1, r2] = poll.results;
    const c1 = candidatesById.get(r1.candidate_id);
    const c2 = candidatesById.get(r2.candidate_id);
    if (!c1 || !c2) continue;
    const [a, b] = [c1, c2].sort((x, y) => x.slug.localeCompare(y.slug));
    const label = `${a.slug}-vs-${b.slug}`;
    const ids: [string, string] = [a.id, b.id];
    if (!groups.has(label)) groups.set(label, { polls: [], candidateIds: ids });
    groups.get(label)!.polls.push(poll);
  }
  return groups;
}

async function recalculateForElection(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  electionId: string,
  keepHistory: boolean,
) {
  const { data: election } = await supabase
    .from("elections")
    .select("id, name, election_date, round")
    .eq("id", electionId)
    .single();

  if (!election) return { error: "Election not found", electionId };

  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, slug")
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

  // deno-lint-ignore no-explicit-any
  const enrichedPolls = polls.map((p: any) => ({
    ...p,
    institute_reliability: p.institute?.reliability_score ?? 0.7,
  }));

  // Snapshot: limpa entradas anteriores antes de inserir.
  if (!keepHistory) {
    const { error: delErr } = await supabase
      .from("weighted_averages")
      .delete()
      .eq("election_id", electionId);
    if (delErr) return { error: "Failed to clear old: " + delErr.message, electionId };
  }

  const now = new Date().toISOString();
  // deno-lint-ignore no-explicit-any
  const rows: any[] = [];
  // deno-lint-ignore no-explicit-any
  const summary: any[] = [];

  const isSecondRound = election.round === 2;

  if (isSecondRound) {
    // ─── 2T: agrupa por cenário (par de candidatos) ───
    // Cada cenário (A vs B) é independente — média por cenário, não global.
    const candById = new Map<string, CandidateRow>(
      // deno-lint-ignore no-explicit-any
      candidates.map((c: any) => [c.id, c]),
    );
    const scenarios = groupPollsByScenario(enrichedPolls, candById);

    for (const [scenarioLabel, { polls: scenarioPolls, candidateIds }] of scenarios) {
      for (const cid of candidateIds) {
        const avg = calculateWeightedAverage(scenarioPolls, cid, referenceDate);
        if (!avg) continue;
        const cand = candById.get(cid)!;
        rows.push({
          election_id: electionId,
          candidate_id: cid,
          scenario_label: scenarioLabel,
          calculated_at: now,
          ...avg,
          calculation_params: {
            half_life: 10,
            reference_date: referenceDate.toISOString(),
            scenario: scenarioLabel,
          },
        });
        summary.push({ candidate: cand.name, scenario: scenarioLabel, ...avg });
      }
    }
  } else {
    // ─── 1T (e demais): lógica clássica, média global por candidato ───
    for (const cand of candidates) {
      const avg = calculateWeightedAverage(enrichedPolls, cand.id, referenceDate);
      if (!avg) continue;
      rows.push({
        election_id: electionId,
        candidate_id: cand.id,
        scenario_label: null,
        calculated_at: now,
        ...avg,
        calculation_params: {
          half_life: 10,
          reference_date: referenceDate.toISOString(),
        },
      });
      summary.push({ candidate: cand.name, ...avg });
    }
  }

  if (rows.length === 0) {
    return { election: election.name, results: [], note: "No candidates with valid weighted average" };
  }

  const { error: insErr } = await supabase.from("weighted_averages").insert(rows);
  if (insErr) return { error: "Insert failed: " + insErr.message, electionId };

  return {
    election: election.name,
    round: election.round,
    count: rows.length,
    scenarios: isSecondRound ? summary.length / 2 : null,
    results: summary,
    timestamp: now,
  };
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

    if (allFlag === "true") {
      const { data: pollElections } = await supabase
        .from("polls")
        .select("election_id")
        .order("election_id");
      const uniqIds = Array.from(
        // deno-lint-ignore no-explicit-any
        new Set((pollElections ?? []).map((p: any) => p.election_id as string)),
      );
      // deno-lint-ignore no-explicit-any
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
