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
  console.log("📊 Verificando dados de deputado...\n");
  
  const { count: totalDep } = await sb
    .from("poll_drafts")
    .select("*", { count: "exact", head: true })
    .in("source_kind", ["tier1-manual", "simulated", "tier2-presidencial"]);
  
  console.log(`Total de polls: ${totalDep}\n`);

  const { data: samples } = await sb
    .from("poll_drafts")
    .select("id, institute_name, scope, source_kind, publication_date")
    .in("source_kind", ["tier1-manual", "simulated", "tier2-presidencial"])
    .limit(5);

  if (samples) {
    console.log("Amostra (5 primeiros):");
    samples.forEach(s => {
      console.log(`  • ${s.institute_name.padEnd(25)} | ${s.scope} | ${s.source_kind}`);
    });
  }
})();
