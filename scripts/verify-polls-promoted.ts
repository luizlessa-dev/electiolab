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
  console.log(`\n✅ Verificação pós-promoção\n`);

  const { count: allPolls } = await sb
    .from("polls")
    .select("*", { count: "exact", head: true });

  const { count: deputados } = await sb
    .from("polls")
    .select("*", { count: "exact", head: true })
    .in("source_kind", ["tier1-manual", "simulated", "tier2-presidencial"]);

  console.log(`Total de polls no banco:      ${allPolls}`);
  console.log(`Polls de deputado/presidencial: ${deputados}\n`);

  const { data: sample } = await sb
    .from("polls")
    .select("id, institute_id, scope, source_kind, publication_date")
    .in("source_kind", ["tier1-manual", "simulated", "tier2-presidencial"])
    .limit(3);

  if (sample) {
    console.log("Amostra:");
    sample.forEach(p => {
      console.log(`  • ${p.scope || "BR"} | ${p.source_kind.padEnd(20)} | ${p.publication_date}`);
    });
  }
  console.log();
})();
