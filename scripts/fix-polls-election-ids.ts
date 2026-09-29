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
  console.log(`\n🔧 Corrigindo election_ids dos polls\n`);

  // Pegar todos os elections deputado_federal
  const { data: elections } = await sb
    .from("elections")
    .select("id, state")
    .eq("type", "deputado_federal")
    .eq("year", 2026);

  const electionMap = new Map((elections || []).map(e => [e.state, e.id]));

  // Pegar polls com problema
  const { data: polls } = await sb
    .from("polls")
    .select("id, scope, source_kind")
    .in("source_kind", ["tier1-manual", "simulated", "tier2-presidencial"]);

  if (!polls?.length) {
    console.log("Sem polls");
    return;
  }

  console.log(`📊 ${polls.length} polls encontrados\n`);

  let fixed = 0;
  for (const poll of polls) {
    const correctElectionId = electionMap.get(poll.scope || "");
    if (!correctElectionId) {
      console.log(`⚠️  ${poll.scope}: election não encontrada`);
      continue;
    }

    const { error } = await sb
      .from("polls")
      .update({ election_id: correctElectionId })
      .eq("id", poll.id);

    if (error) {
      console.log(`❌ ${poll.id}: ${error.message}`);
    } else {
      fixed++;
    }
  }

  console.log(`\n✅ ${fixed}/${polls.length} polls corrigidos\n`);
})();
