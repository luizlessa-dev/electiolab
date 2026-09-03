import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

interface PollRow {
  id: string;
  fieldwork_end: string;
  sample_size: number;
  methodology: string;
  margin_of_error?: number; // margin of error in percentage points
  institute_reliability?: number; // deprecated
  credibility_score?: number; // 0-10 (from institutes table or data_source_audit)
}

interface ResultRow {
  candidate_id: string;
  percentage: number;
}

interface CandidateRow {
  id: string;
  name: string;
  // candidates.slug é nullable no banco (cadastro de 2022 veio sem). Declarar
  // como `string` aqui escondia o null e derrubava o recálculo no localeCompare.
  slug: string | null;
}

const METHODOLOGY_WEIGHTS: Record<string, number> = {
  presencial: 1.0,
  telefonica: 0.95,
  mista: 0.85,
  online: 0.9,
};

const RECENCY_HALF_LIFE_DAYS = 14; // increased from 10 days
const BASELINE_MOE = 2.5; // baseline margin of error for weight calculation

function calculateWeightedAverage(
  polls: (PollRow & { results: ResultRow[] })[],
  candidateId: string,
  referenceDate: Date,
  halfLifeDays: number = RECENCY_HALF_LIFE_DAYS,
) {
  // Phase 1: Calculate rough average to detect outliers
  let roughSum = 0;
  let roughCount = 0;
  for (const poll of polls) {
    const result = poll.results.find((r) => r.candidate_id === candidateId);
    if (result) {
      roughSum += result.percentage;
      roughCount++;
    }
  }
  const roughAverage = roughCount > 0 ? roughSum / roughCount : 0;

  // Phase 2: Calculate rough std dev for outlier detection
  let roughVarianceSum = 0;
  for (const poll of polls) {
    const result = poll.results.find((r) => r.candidate_id === candidateId);
    if (result) {
      roughVarianceSum += Math.pow(result.percentage - roughAverage, 2);
    }
  }
  const roughStdDev = roughCount > 0 ? Math.sqrt(roughVarianceSum / roughCount) : 1;

  // Phase 3: Calculate weighted average with all factors
  let weightedSum = 0;
  let totalWeight = 0;
  let pollCount = 0;
  let totalSampleSize = 0;
  const values: { pct: number; weight: number; isOutlier: boolean }[] = [];

  for (const poll of polls) {
    const result = poll.results.find((r) => r.candidate_id === candidateId);
    if (!result) continue;

    const daysOld =
      (referenceDate.getTime() - new Date(poll.fieldwork_end).getTime()) /
      86400000;
    const recencyWeight = Math.pow(0.5, Math.max(0, daysOld) / halfLifeDays);
    const sampleWeight = Math.sqrt(poll.sample_size / 1000);
    const methodWeight = METHODOLOGY_WEIGHTS[poll.methodology] ?? 0.5;

    // Institute credibility weight (0-10 scale with exponent 1.5)
    const credScore = poll.credibility_score ?? poll.institute_reliability ?? 5;
    const instituteWeight = Math.pow(Math.max(0, Math.min(10, credScore)) / 10, 1.5);

    // Margin of error weight (PHASE 2)
    let moeWeight = 1.0;
    if (poll.margin_of_error) {
      moeWeight = Math.min(1.5, BASELINE_MOE / Math.max(0.5, poll.margin_of_error));
    }

    // Outlier detection weight (PHASE 2)
    const zscore = Math.abs(result.percentage - roughAverage) / Math.max(roughStdDev, 1);
    const isOutlier = zscore > 2;
    const outlierWeight = isOutlier ? 0.5 : 1.0;

    const finalWeight =
      recencyWeight * sampleWeight * methodWeight * instituteWeight * moeWeight * outlierWeight;

    weightedSum += result.percentage * finalWeight;
    totalWeight += finalWeight;
    totalSampleSize += poll.sample_size;
    pollCount++;
    values.push({ pct: result.percentage, weight: finalWeight, isOutlier });
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
    // Candidato de eleição antiga pode não ter slug (a coluna é nullable e o
    // cadastro de 2022 veio sem). Cai pro id, que sempre existe: o label fica
    // feio, mas é estável e não derruba o recálculo inteiro.
    const key = (c: CandidateRow) => c.slug ?? c.id;
    const [a, b] = [c1, c2].sort((x, y) => key(x).localeCompare(key(y)));
    const label = `${key(a)}-vs-${key(b)}`;
    const ids: [string, string] = [a.id, b.id];
    if (!groups.has(label)) groups.set(label, { polls: [], candidateIds: ids });
    groups.get(label)!.polls.push(poll);
  }
  return groups;
}

interface InstituteJoin {
  reliability_score: number | null;
}

interface PollQueryRow {
  id: string;
  fieldwork_end: string;
  sample_size: number;
  methodology: string;
  institute: InstituteJoin | null;
  results: ResultRow[];
}

interface WeightedAverageInsertRow {
  election_id: string;
  candidate_id: string;
  scenario_label: string | null;
  calculated_at: string;
  weighted_average: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  polls_included: number;
  total_sample_size: number;
  calculation_params: {
    half_life: number;
    reference_date: string;
    scenario?: string;
  };
}

interface WeightedAverageSummary {
  candidate: string;
  scenario?: string;
  weighted_average: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  polls_included: number;
  total_sample_size: number;
}

async function recalculateForElection(
  supabase: SupabaseClient,
  electionId: string,
  keepHistory: boolean,
) {
  const { data: election } = await supabase
    .from("elections")
    .select("id, name, election_date, round, state")
    .eq("id", electionId)
    .single();

  if (!election) return { error: "Election not found", electionId };

  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, slug")
    .eq("election_id", electionId)
    // Sem filtro por is_active de propósito. Quem decide se alguém entra na
    // média é poll_results.excluded_reason, derivado do arquivo de candidaturas
    // do TSE. `is_active` era o mecanismo manual antigo pra esconder
    // não-candidato e ficou desatualizado: escondia 5 candidatos registrados
    // (Flavio Bolsonaro no 2T, Ciro Gomes em gov/CE, Simone Tebet em sen/SP,
    // João Azevêdo em sen/PB, Mara Rocha em sen/AC) — no caso do Flávio, sumia
    // com o cenário de 2º turno com mais pesquisas da base.
    // Quem não concorre já não tem linha válida aqui, então calculateWeightedAverage
    // devolve null e o candidato é pulado de qualquer forma.
    .returns<CandidateRow[]>();

  if (!candidates?.length) return { error: "No candidates", electionId };

  let pollsQuery = supabase
    .from("polls")
    .select(`
      id, fieldwork_end, sample_size, methodology,
      institute:institutes(reliability_score),
      results:poll_results(candidate_id, percentage)
    `)
    .eq("election_id", electionId)
    // Só resultados de quem é candidato registrado no cargo/UF. As linhas
    // marcadas continuam no banco como registro do que o instituto publicou,
    // mas não entram na média — ver poll_results.excluded_reason e
    // scripts/flag-non-candidates-in-polls.ts.
    .is("results.excluded_reason", null);

  // scope só é ambíguo pra eleição SEM estado próprio (Presidente): o TSE registra pesquisa
  // presidencial sob UE=BR mesmo quando a amostra é de um único estado (ver ingest-manual.ts),
  // então sem esse filtro um corte de Rondônia ou Amazonas entraria na mesma média "nacional"
  // que uma pesquisa de fato nacional. Pra eleições com estado próprio (Governador/Senador),
  // scope não filtra nada — o valor em si já varia entre convenções antigas ("estadual",
  // "uf:XX", sigla nua) sem que isso mude o que a pesquisa mede: é sempre daquele estado.
  if (!election.state) {
    pollsQuery = pollsQuery.eq("scope", "nacional");
  }

  const { data: polls } = await pollsQuery
    .order("publication_date", { ascending: false })
    .returns<PollQueryRow[]>();

  if (!polls?.length) return { error: "No polls", electionId };

  const referenceDate = election.election_date
    ? new Date(election.election_date)
    : new Date();

  const enrichedPolls = polls.map((p) => ({
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
  const rows: WeightedAverageInsertRow[] = [];
  const summary: WeightedAverageSummary[] = [];

  const isSecondRound = election.round === 2;

  if (isSecondRound) {
    // ─── 2T: agrupa por cenário (par de candidatos) ───
    // Cada cenário (A vs B) é independente — média por cenário, não global.
    const candById = new Map<string, CandidateRow>(
      candidates.map((c): [string, CandidateRow] => [c.id, c]),
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
        .order("election_id")
        .returns<{ election_id: string }[]>();
      const uniqIds = Array.from(
        new Set((pollElections ?? []).map((p) => p.election_id)),
      );
      // Erro numa eleição não pode abortar as outras: isso roda em cron a cada
      // 6h e um único registro ruim deixaria a base inteira sem recalcular.
      const out: Awaited<ReturnType<typeof recalculateForElection>>[] = [];
      for (const id of uniqIds) {
        try {
          out.push(await recalculateForElection(supabase, id, keepHistory));
        } catch (err) {
          out.push({ error: String(err), electionId: id });
        }
      }
      const falhas = out.filter((r) => "error" in r && r.error).length;
      return new Response(
        JSON.stringify({
          success: true,
          mode: "all",
          elections_processed: out.length,
          elections_failed: falhas,
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
