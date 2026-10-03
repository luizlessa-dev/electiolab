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
  console.log("\n📊 VERIFICAÇÃO DE IMPORTS\n");

  const { count: tier2Count } = await sb
    .from("poll_drafts")
    .select("*", { count: "exact", head: true })
    .eq("source_kind", "tier2-presidencial");

  const { count: simulatedCount } = await sb
    .from("poll_drafts")
    .select("*", { count: "exact", head: true })
    .eq("source_kind", "simulated");

  const { count: tier1Count } = await sb
    .from("poll_drafts")
    .select("*", { count: "exact", head: true })
    .eq("source_kind", "tier1-manual");

  console.log(`Tier 2 Presidencial:  ${tier2Count} polls`);
  console.log(`Simulated Deputado:   ${simulatedCount} polls`);
  console.log(`Tier 1 Deputado:      ${tier1Count} polls`);
  console.log(`─────────────────────────────────`);
  console.log(`TOTAL:                ${(tier2Count || 0) + (simulatedCount || 0) + (tier1Count || 0)} polls\n`);

  // Amostra de dados
  const { data: sample } = await sb
    .from("poll_drafts")
    .select("institute_name, scope, source_kind, results")
    .eq("source_kind", "simulated")
    .limit(3);

  if (sample?.length) {
    console.log("Amostra de Simulated (Deputado):");
    sample.forEach(p => {
      const first = Array.isArray(p.results) ? p.results[0] : null;
      console.log(`  • ${p.institute_name} | ${p.scope} | ${first?.name} (${first?.pct}%)`);
    });
  }
})();
