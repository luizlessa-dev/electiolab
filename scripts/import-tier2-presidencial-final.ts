import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

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
  console.log(`\n📥 Import Tier 2 Presidencial\n`);

  const data = JSON.parse(fs.readFileSync("data/tier2-pesquisas-2026.json", "utf-8"));
  
  const { data: elections } = await sb
    .from("elections")
    .select("id")
    .eq("type", "presidente")
    .eq("year", 2026);

  if (!elections || elections.length === 0) {
    console.error("❌ No election found");
    return;
  }

  const electionId = elections[0].id;
  const institutes = Object.keys(data).filter(k => k !== "metadata");
  
  let pollsToSave: any[] = [];

  for (const institute of institutes) {
    const polls = data[institute];
    if (!Array.isArray(polls)) continue;

    for (const poll of polls) {
      if (!poll.notes || !poll.source_url) continue;
      const candidates = parseNotes(poll.notes);
      if (candidates.length === 0) continue;

      const results = candidates.map(c => ({ name: c.candidate, pct: c.percentage }));

      pollsToSave.push({
        election_id: electionId,
        institute_name: poll.institute,
        fieldwork_start: poll.fieldwork_start,
        fieldwork_end: poll.fieldwork_end,
        publication_date: poll.publication_date,
        sample_size: poll.sample_size,
        margin_of_error: poll.margin_of_error,
        methodology: poll.methodology || "mista",
        scope: "1t",
        round: 1,
        results: results,
        source_url: poll.source_url,
        source_kind: "tier2-presidencial",
        status: "approved"
      });
    }
  }

  console.log(`📊 Saving ${pollsToSave.length} polls...`);

  const { error } = await sb.from("poll_drafts").insert(pollsToSave);

  if (error) {
    console.error(`❌ Error: ${error.message}`);
  } else {
    console.log(`✅ ${pollsToSave.length} polls saved!`);
  }
}

importAndSave().catch(console.error);
