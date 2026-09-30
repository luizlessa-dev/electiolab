import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseNotes(notes: string): Array<{ candidate: string; percentage: number }> {
  const results: Array<{ candidate: string; percentage: number }> = [];
  const pattern = /(\w+[\w\s]*?)\s+(\d+(?:\.\d+)?)\%/g;
  let match;
  while ((match = pattern.exec(notes)) !== null) {
    results.push({ candidate: match[1].trim(), percentage: parseFloat(match[2]) });
  }
  return results;
}

async function importAndSave() {
  console.log(`\n📥 Import Tier 2 Presidencial + SAVE\n`);

  const data = JSON.parse(fs.readFileSync("data/tier2-pesquisas-2026.json", "utf-8"));
  
  // Get presidential election
  const { data: elections } = await sb
    .from("elections")
    .select("id")
    .eq("type", "presidente")
    .eq("year", 2026);

  if (!elections || elections.length === 0) {
    console.error("❌ No presidential election found for 2026");
    return;
  }

  const electionId = elections[0].id;
  const institutes = Object.keys(data).filter(k => k !== "metadata");
  
  let pollsToSave: any[] = [];
  let imported = 0;

  for (const institute of institutes) {
    const polls = data[institute];
    if (!Array.isArray(polls)) continue;
    
    for (const poll of polls) {
      if (!poll.notes) continue;
      const candidates = parseNotes(poll.notes);
      if (candidates.length === 0) continue;

      for (const cand of candidates) {
        pollsToSave.push({
          election_id: electionId,
          institute_name: poll.institute,
          candidate: cand.candidate,
          candidate_slug: cand.candidate.toLowerCase().replace(/\s+/g, "-"),
          office: "presidente",
          scope: "BR",
          percentage: cand.percentage,
          margin_of_error: poll.margin_of_error,
          fieldwork_end: poll.fieldwork_end,
          publication_date: poll.publication_date,
          sample_size: poll.sample_size,
          methodology: "mista",
          source_kind: "tier2-presidencial",
          status: "approved",
          notes: poll.notes
        });
        imported++;
      }
    }
  }

  console.log(`📊 Saving ${imported} polls...`);

  if (pollsToSave.length === 0) {
    console.log("⚠️  No polls to save");
    return;
  }

  const { error } = await sb.from("poll_drafts").insert(pollsToSave);

  if (error) {
    console.error(`❌ Error: ${error.message}`);
  } else {
    console.log(`✅ ${imported} polls saved!`);
  }
}

importAndSave().catch(console.error);
