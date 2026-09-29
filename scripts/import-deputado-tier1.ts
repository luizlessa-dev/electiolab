#!/usr/bin/env npx tsx
/**
 * Import: Pesquisas Tier 1 de Deputado Federal 2026
 *
 * Lê data/pesqele_deputado_import.json e insere em poll_drafts
 * com status='approved' (Tier 1 = institutos reputados).
 *
 * Uso:
 *   npx tsx scripts/import-deputado-tier1.ts --dry-run
 *   npx tsx scripts/import-deputado-tier1.ts --apply
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const APPLY = process.argv.includes("--apply");
const DRY_RUN = process.argv.includes("--dry-run") || !APPLY;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TierPoll {
  id: string;
  institute: string;
  position: string;
  state: string;
  region: string;
  fieldwork_start: string;
  fieldwork_end: string;
  publication_date: string;
  sample_size: number;
  margin_of_error: number;
  poll_name: string;
  source_url: string;
  tse_register: string;
  poll_type: string;
  notes: string;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ poll: string; error: string }>;
}

async function importTierPolicies() {
  console.log(`\n📥 Tier 1 Deputado Federal Import\n`);
  console.log(`Mode: ${DRY_RUN ? "🔍 DRY-RUN" : "✍️  APPLY (will save)"}\n`);

  // 1. Read data file
  const dataFile = path.join(process.cwd(), "data/pesqele_deputado_import.json");
  if (!fs.existsSync(dataFile)) {
    console.error(`❌ File not found: ${dataFile}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  const polls: TierPoll[] = rawData.deputado_federal_polls || [];

  console.log(`Found ${polls.length} polls to import\n`);

  // 2. Get election
  const electionsRes = await sb
    .from("elections")
    .select("id, type, state, year")
    .eq("type", "deputado_federal")
    .eq("year", 2026)
    .limit(1);

  if (electionsRes.error || !electionsRes.data?.length) {
    console.warn(
      `⚠️  No election found for deputado_federal 2026, creating template...`
    );
  }

  // 3. Get institutes
  const institutesRes = await sb
    .from("institutes")
    .select("id, name")
    .in("name", ["Datafolha", "Atlas Intel", "Paraná Pesquisas"]);

  const institutesMap = new Map(
    (institutesRes.data || []).map((i) => [i.name.toUpperCase(), i.id])
  );

  console.log(
    `Found ${institutesMap.size} institutes in database\n`
  );

  // 4. Process each poll
  const result: ImportResult = {
    total: polls.length,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  for (const poll of polls) {
    try {
      const instituteName = poll.institute.toUpperCase();
      const instituteId = institutesMap.get(instituteName);

      if (!instituteId) {
        result.errors.push({
          poll: poll.poll_name,
          error: `Institute not found: ${poll.institute}`,
        });
        result.skipped++;
        continue;
      }

      // Find election for this state
      const electionRes = await sb
        .from("elections")
        .select("id")
        .eq("type", "deputado_federal")
        .eq("state", poll.state)
        .eq("year", 2026)
        .single();

      if (electionRes.error) {
        result.errors.push({
          poll: poll.poll_name,
          error: `Election not found for ${poll.state}`,
        });
        result.skipped++;
        continue;
      }

      const electionId = electionRes.data.id;

      // Build poll_draft
      const pollDraft = {
        election_id: electionId,
        institute_name: poll.institute,
        fieldwork_start: poll.fieldwork_start,
        fieldwork_end: poll.fieldwork_end,
        publication_date: poll.publication_date,
        sample_size: poll.sample_size,
        margin_of_error: poll.margin_of_error,
        methodology: "presencial", // TSE data suggests this
        tse_protocolo: null, // Será preenchido depois
        source_url: poll.source_url,
        source_kind: "tier1-manual",
        status: "approved", // Tier 1 auto-approved
        round: 1,
        scenario_label: null,
        results: [], // No candidate-level data (aggregate only)
        notes: poll.notes,
      };

      if (DRY_RUN) {
        console.log(`✓ Would import: ${poll.poll_name}`);
        console.log(
          `   Institute: ${poll.institute} | State: ${poll.state}`
        );
        console.log(
          `   Fieldwork: ${poll.fieldwork_start} to ${poll.fieldwork_end}`
        );
        console.log(
          `   Sample: ${poll.sample_size} | Margin: ±${poll.margin_of_error}%\n`
        );
      } else {
        // Insert into poll_drafts
        const insertRes = await sb
          .from("poll_drafts")
          .insert([pollDraft])
          .select("id");

        if (insertRes.error) {
          result.errors.push({
            poll: poll.poll_name,
            error: insertRes.error.message,
          });
          result.skipped++;
        } else {
          console.log(`✓ Imported: ${poll.poll_name} (${insertRes.data[0].id})`);
          result.imported++;
        }
      }
    } catch (err) {
      result.errors.push({
        poll: poll.poll_name,
        error: String(err),
      });
      result.skipped++;
    }
  }

  // 5. Report
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 Import Summary`);
  console.log(`${"═".repeat(60)}`);
  console.log(`Total:    ${result.total}`);
  console.log(`Imported: ${result.imported}`);
  console.log(`Skipped:  ${result.skipped}`);

  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors:`);
    result.errors.forEach((e) => {
      console.log(`   • ${e.poll}: ${e.error}`);
    });
  }

  if (DRY_RUN) {
    console.log(
      `\n🔍 This was a dry-run. Use --apply to actually import.`
    );
  } else if (result.imported > 0) {
    console.log(`\n✅ ${result.imported} polls successfully imported!`);
  }

  console.log();
}

importTierPolicies().catch(console.error);
