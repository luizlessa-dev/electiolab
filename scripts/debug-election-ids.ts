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

(async () => {
  console.log("\n🔍 Debug: IDs e polls\n");

  // Elections
  const { data: elections } = await sb
    .from("elections")
    .select("id, type, state, year")
    .eq("type", "deputado_federal")
    .eq("year", 2026)
    .limit(3);

  console.log("Elections deputado_federal:");
  if (elections) {
    elections.forEach(e => {
      console.log(`  • ${e.state}: ${e.id}`);
    });
  }

  // Polls com deputado_federal
  const { data: polls } = await sb
    .from("polls")
    .select("id, election_id, scope, source_kind")
    .in("source_kind", ["tier1-manual", "simulated", "tier2-presidencial"])
    .limit(5);

  console.log(`\nPolls (${polls?.length || 0}):`);
  if (polls) {
    polls.forEach(p => {
      console.log(`  • election_id: ${p.election_id} | scope: ${p.scope} | ${p.source_kind}`);
    });
  }
})();
