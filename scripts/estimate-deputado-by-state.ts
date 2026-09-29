#!/usr/bin/env npx tsx
/**
 * Gera estimativas de Deputado Federal para todos os estados
 * usando simulação Bayesiana a partir de pesquisas presidenciais.
 *
 * Inserir como poll_drafts com source_kind='simulated' e status='approved'.
 *
 * Uso:
 *   npx tsx scripts/estimate-deputado-by-state.ts --dry-run
 *   npx tsx scripts/estimate-deputado-by-state.ts --apply
 *   npx tsx scripts/estimate-deputado-by-state.ts --apply --state=SP
 */

import { createClient } from "@supabase/supabase-js";
import {
  estimateDeputyForState,
  simulationToPollDraft,
} from "../src/lib/simulador-deputado";

const APPLY = process.argv.includes("--apply");
const DRY_RUN = process.argv.includes("--dry-run") || !APPLY;
const FILTER_STATE = process.argv
  .find((a) => a.startsWith("--state="))
  ?.split("=")[1];

const STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface EstimateResult {
  state: string;
  coalitions: number;
  inserted: number;
  skipped: number;
  error?: string;
}

async function estimateAllStates() {
  console.log(`\n📊 Simulador Dinâmico — Deputado Federal\n`);
  console.log(`Mode: ${DRY_RUN ? "🔍 DRY-RUN" : "✍️  APPLY"}\n`);

  const statesToProcess = FILTER_STATE ? [FILTER_STATE] : STATES;

  const results: EstimateResult[] = [];

  for (const state of statesToProcess) {
    try {
      console.log(`Processing ${state}...`);

      // 1. Find election
      const electionRes = await sb
        .from("elections")
        .select("id")
        .eq("type", "deputado_federal")
        .eq("state", state)
        .eq("year", 2026)
        .single();

      if (electionRes.error) {
        console.warn(`   ⚠️  No election found for ${state}`);
        results.push({
          state,
          coalitions: 0,
          inserted: 0,
          skipped: 1,
          error: "No election",
        });
        continue;
      }

      const electionId = electionRes.data.id;

      // 2. Generate estimates
      const estimates = await estimateDeputyForState(state, sb);

      if (!estimates || estimates.length === 0) {
        console.warn(`   ⚠️  No presidential polls for ${state} (skipped)`);
        results.push({
          state,
          coalitions: 0,
          inserted: 0,
          skipped: 1,
          error: "No presidential polls",
        });
        continue;
      }

      // 3. Convert to poll_drafts
      const pollDrafts = estimates.map((est) =>
        simulationToPollDraft(
          est,
          state,
          electionId,
          new Date().toISOString().split("T")[0]
        )
      );

      if (DRY_RUN) {
        console.log(`   ✓ Would create ${pollDrafts.length} coalitions:`);
        estimates.forEach((est) => {
          console.log(
            `     • ${est.coalition}: ${est.percentage}% (${est.lower_bound}-${est.upper_bound}%)`
          );
        });
      } else {
        // Insert
        const insertRes = await sb.from("poll_drafts").insert(pollDrafts);

        if (insertRes.error) {
          console.error(`   ❌ Error: ${insertRes.error.message}`);
          results.push({
            state,
            coalitions: pollDrafts.length,
            inserted: 0,
            skipped: pollDrafts.length,
            error: insertRes.error.message,
          });
        } else {
          console.log(`   ✓ Inserted ${pollDrafts.length} coalitions`);
          results.push({
            state,
            coalitions: pollDrafts.length,
            inserted: pollDrafts.length,
            skipped: 0,
          });
        }
      }
    } catch (err) {
      console.error(`   ❌ Exception: ${err}`);
      results.push({
        state,
        coalitions: 0,
        inserted: 0,
        skipped: 1,
        error: String(err),
      });
    }

    console.log();
  }

  // Summary
  const totalCoalitions = results.reduce((a, r) => a + r.coalitions, 0);
  const totalInserted = results.reduce((a, r) => a + r.inserted, 0);
  const totalSkipped = results.reduce((a, r) => a + r.skipped, 0);

  console.log(`${"═".repeat(60)}`);
  console.log(`📊 Summary`);
  console.log(`${"═".repeat(60)}`);
  console.log(`States processed:  ${results.length}`);
  console.log(`Total coalitions:  ${totalCoalitions}`);
  console.log(`Inserted:          ${totalInserted}`);
  console.log(`Skipped:           ${totalSkipped}`);

  if (results.some((r) => r.error)) {
    console.log(`\n⚠️  Errors:`);
    results
      .filter((r) => r.error)
      .forEach((r) => {
        console.log(`   ${r.state}: ${r.error}`);
      });
  }

  if (DRY_RUN) {
    console.log(
      `\n🔍 This was a dry-run. Use --apply to actually insert.`
    );
  } else if (totalInserted > 0) {
    console.log(
      `\n✅ Successfully created simulated polls for ${results.filter((r) => r.inserted > 0).length} states!`
    );
  }

  console.log();
}

estimateAllStates().catch(console.error);
