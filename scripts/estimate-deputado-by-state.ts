import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { simulateDeputyIntention } from "../src/lib/simulador-deputado";

const envFile = path.join(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const idx = line.indexOf("=");
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const STATES = ["SP", "RJ", "MG", "BA", "SC", "RS", "PE", "CE", "GO", "DF", "PR", "PA", "MA", "ES", "PB", "RN", "AL", "PI", "MS", "MT", "RO", "AC", "AM", "AP", "RR", "TO"];
const DRY_RUN = process.argv.includes("--dry-run");
const APPLY = process.argv.includes("--apply");
const SINGLE_STATE = process.argv.find(a => a.startsWith("--state="))?.split("=")[1];

async function main() {
  console.log(`\n📊 Simulador Dinâmico — Deputado Federal\n`);
  console.log(`Mode: ${DRY_RUN ? "🔍 DRY-RUN" : APPLY ? "✍️  APPLY" : "ℹ️  INFO"}\n`);

  const { data: elections } = await sb
    .from("elections")
    .select("id")
    .eq("type", "presidente")
    .eq("year", 2026)
    .limit(1);

  if (!elections?.length) {
    console.error("❌ No presidential election found");
    return;
  }

  const electionId = elections[0].id;
  const statesToProcess = SINGLE_STATE ? [SINGLE_STATE] : STATES;
  let totalCreated = 0;

  for (const state of statesToProcess) {
    try {
      const { data: presPolls } = await sb
        .from("poll_drafts")
        .select("results, fieldwork_end")
        .eq("source_kind", "tier2-presidencial")
        .order("fieldwork_end", { ascending: false })
        .limit(1);

      if (!presPolls?.length) continue;

      const poll = presPolls[0];
      if (!Array.isArray(poll.results)) continue;

      const presidentialData = poll.results.map((r: any) => ({
        candidate: r.name,
        percentage: r.pct,
        candidate_slug: r.name.toLowerCase().replace(/\s+/g, "-"),
        fieldwork_end: poll.fieldwork_end
      }));

      const estimates = simulateDeputyIntention(presidentialData, state);

      if (estimates.length === 0) continue;

      const pollsToInsert = estimates.map(est => ({
        election_id: electionId,
        institute_name: "ElectioLab Simulador",
        fieldwork_start: poll.fieldwork_end,
        fieldwork_end: poll.fieldwork_end,
        publication_date: new Date().toISOString().split("T")[0],
        sample_size: 10000,
        margin_of_error: (est.upper_bound - est.lower_bound) / 3.92,
        methodology: "simulacao-bayesiana",
        scope: state,
        round: 1,
        results: [{ name: est.coalition, pct: est.percentage }],
        source_url: "https://electiolab.com/simulador",
        source_kind: "simulated",
        status: "approved"
      }));

      if (DRY_RUN) {
        console.log(`✓ ${state}: ${estimates.length} coalitions`);
        estimates.forEach(e => {
          console.log(`     • ${e.coalition}: ${e.percentage.toFixed(1)}% (${e.lower_bound.toFixed(1)}-${e.upper_bound.toFixed(1)}%)`);
        });
      } else if (APPLY) {
        const { error } = await sb.from("poll_drafts").insert(pollsToInsert);
        if (error) {
          console.log(`❌ ${state}: ${error.message}`);
        } else {
          totalCreated += pollsToInsert.length;
          console.log(`✓ ${state}: ${pollsToInsert.length} polls`);
        }
      }
    } catch (err) {
      console.log(`❌ ${state}: ${err}`);
    }
  }

  console.log(`\n📊 Summary: ${totalCreated} polls created`);
  if (DRY_RUN) console.log(`🔍 Use --apply to insert`);
}

main().catch(console.error);
