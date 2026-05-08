#!/usr/bin/env npx tsx
/** Inspeção rápida do dataset prior_election_results para projetar páginas SEO. */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

(async () => {
  for (const year of [2018, 2022]) {
    const { count: total } = await sb.from("prior_election_results").select("*", { count: "exact", head: true }).eq("year", year);
    console.log(`\n━━━ ${year}: ${total} linhas ━━━`);

    // Por election_type
    const { data: byType } = await sb.from("prior_election_results").select("election_type").eq("year", year);
    const types: Record<string, number> = {};
    for (const r of byType ?? []) types[r.election_type] = (types[r.election_type] ?? 0) + 1;
    console.log(`  por cargo:`, Object.entries(types).sort((a, b) => b[1] - a[1]));

    // Por status
    const { data: byStatus } = await sb.from("prior_election_results").select("result_status").eq("year", year);
    const status: Record<string, number> = {};
    for (const r of byStatus ?? []) status[r.result_status] = (status[r.result_status] ?? 0) + 1;
    console.log(`  por status:`, status);

    // Sample row
    const { data: sample } = await sb.from("prior_election_results").select("*, candidate:candidates(name, slug, party)").eq("year", year).limit(2);
    console.log(`  amostra:`, JSON.stringify(sample, null, 2).slice(0, 800));
  }
})();
