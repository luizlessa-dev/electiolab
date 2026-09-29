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
  const { count: pollDraftsCount } = await sb
    .from("poll_drafts")
    .select("*", { count: "exact", head: true })
    .in("source_kind", ["tier1-manual", "simulated", "tier2-presidencial"]);

  const { count: pollsCount } = await sb
    .from("polls")
    .select("*", { count: "exact", head: true })
    .eq("type", "deputado_federal");

  console.log(`\n📊 Tabelas:\n`);
  console.log(`poll_drafts (deputado): ${pollDraftsCount || 0} registros`);
  console.log(`polls (deputado):       ${pollsCount || 0} registros\n`);
})();
