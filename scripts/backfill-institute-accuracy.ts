#!/usr/bin/env npx tsx
/**
 * Fase 1 do roadmap reliability_score.
 *
 * Para cada poll cuja eleição já tem resultados oficiais (prior_election_results),
 * compara percentuais publicados (poll_results) vs reais (prior_election_results)
 * e grava em institute_accuracy_observations.
 *
 * Uso:
 *   npx tsx scripts/backfill-institute-accuracy.ts             # dry-run
 *   npx tsx scripts/backfill-institute-accuracy.ts --apply     # grava
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs"; import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const idx = line.indexOf("="); if (idx > 0) {
    const k = line.slice(0, idx).trim(); const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
const APPLY = process.argv.includes("--apply");

type Poll = {
  id: string;
  institute_id: string;
  election_id: string;
  fieldwork_end: string;
  publication_date: string;
  election: { year: number; election_date: string | null; type: string; state: string; round: number } | null;
};

(async () => {
  console.log(`\n📊 Backfill institute_accuracy_observations`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);

  // 1) Polls de 2018 ou 2022 com election_date conhecido
  const { data: polls, error: e1 } = await sb
    .from("polls")
    .select("id, institute_id, election_id, fieldwork_end, publication_date, election:elections(year, election_date, type, state, round)")
    .in("election.year", [2018, 2022]);
  if (e1) throw e1;
  const eligible = (polls ?? []).filter((p) => {
    const el = Array.isArray(p.election) ? p.election[0] : p.election;
    return el?.year && el?.election_date;
  }) as unknown as Poll[];
  console.log(`   ${eligible.length} polls candidatas (2018/2022 com election_date)`);

  // 2) Para cada poll, pega poll_results + prior_election_results agregado por candidato/UF/ano
  let observations = 0, skipped = 0, applied = 0;
  for (const poll of eligible) {
    const el = Array.isArray(poll.election) ? poll.election[0] : poll.election;
    if (!el) { skipped++; continue; }

    const { data: results } = await sb
      .from("poll_results")
      .select("candidate_id, percentage")
      .eq("poll_id", poll.id);
    if (!results?.length) { skipped++; continue; }

    // Resultados oficiais: somatório por candidato no UF/ano/cargo/turno
    const cands = results.map((r) => r.candidate_id);
    const { data: actual } = await sb
      .from("prior_election_results")
      .select("candidate_id, total_votes, election_type, state, year, round")
      .in("candidate_id", cands)
      .eq("year", el.year)
      .eq("election_type", el.type)
      .eq("state", el.state)
      .eq("round", el.round ?? 1);

    if (!actual?.length) { skipped++; continue; }

    // Soma votos por candidato
    const votesByCand = new Map<string, number>();
    for (const r of actual) {
      votesByCand.set(r.candidate_id, (votesByCand.get(r.candidate_id) ?? 0) + (r.total_votes ?? 0));
    }
    const totalVotes = [...votesByCand.values()].reduce((a, b) => a + b, 0);
    if (totalVotes === 0) { skipped++; continue; }

    // Dias entre fieldwork_end e election_date
    const electionDate = new Date(el.election_date!);
    const fwEnd = new Date(poll.fieldwork_end);
    const daysBefore = Math.max(0, Math.round((electionDate.getTime() - fwEnd.getTime()) / 86400000));

    // Construir observações
    const rows: Array<Record<string, unknown>> = [];
    for (const r of results) {
      const votes = votesByCand.get(r.candidate_id);
      if (votes === undefined) continue;
      const actualPct = (votes / totalVotes) * 100;
      rows.push({
        institute_id: poll.institute_id,
        poll_id: poll.id,
        election_id: poll.election_id,
        candidate_id: r.candidate_id,
        poll_published_pct: Number(r.percentage),
        actual_pct: Number(actualPct.toFixed(2)),
        fieldwork_end_days_before: daysBefore,
        round: el.round ?? 1,
        observed_via: "imported",
      });
    }
    observations += rows.length;

    if (APPLY && rows.length) {
      const { error } = await sb.from("institute_accuracy_observations").upsert(rows, {
        onConflict: "institute_id,election_id,candidate_id,fieldwork_end_days_before,round",
        ignoreDuplicates: true,
      });
      if (error) {
        console.error(`  ❌ poll ${poll.id}: ${error.message}`);
        continue;
      }
      applied += rows.length;
    }
  }

  console.log(`\n   📊 ${observations} observações geradas, ${skipped} polls puladas (sem dados)`);
  if (APPLY) console.log(`   💾 ${applied} gravadas em institute_accuracy_observations`);

  // 3) Mostra summary view
  console.log(`\n--- institute_accuracy_summary (top 10 por mae_7d) ---`);
  const { data: sum } = await sb
    .from("institute_accuracy_summary")
    .select("institute_name, observations_total, obs_within_7d, mae_7d, mae_overall, suggested_reliability_score")
    .gt("observations_total", 0)
    .order("mae_7d", { ascending: true, nullsFirst: false })
    .limit(10);
  for (const s of sum ?? []) {
    const mae7 = s.mae_7d != null ? `MAE_7d=${Number(s.mae_7d).toFixed(2)}pp` : "MAE_7d=—";
    const sug = s.suggested_reliability_score != null ? `→ ${Number(s.suggested_reliability_score).toFixed(2)}` : "→ —";
    console.log(`   ${s.institute_name.padEnd(28)} obs=${String(s.observations_total).padStart(3)} <=7d=${String(s.obs_within_7d).padStart(2)}  ${mae7}  ${sug}`);
  }
})();
