#!/usr/bin/env npx tsx
/** Checa cobertura de candidatos AP governador 2026. */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs"; import * as path from "path";
const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const idx = line.indexOf("="); if (idx > 0) { const k = line.slice(0, idx).trim(); const v = line.slice(idx + 1).trim().replace(/^"|"$/g, ""); if (k && !process.env[k]) process.env[k] = v; }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

(async () => {
  const { data: el } = await sb.from("elections").select("id, name").eq("type", "governador").eq("year", 2026).eq("state", "AP").single();
  console.log("Election AP/governador/2026:", el);
  if (!el) return;
  const { data: cands } = await sb.from("candidates").select("name, party, slug, is_active, bio").eq("election_id", el.id);
  console.log(`\nCandidatos (${cands?.length ?? 0}):`);
  for (const c of cands ?? []) console.log(`  - ${c.name} (${c.party}) slug=${c.slug} active=${c.is_active} bio=${c.bio ? "sim" : "não"}`);

  // Comparar com UFs próximos em volume populacional (RR, AC) para benchmark
  console.log("\n--- benchmark UFs pequenas ---");
  for (const uf of ["RR", "AC", "TO", "RO"]) {
    const { data: e2 } = await sb.from("elections").select("id").eq("type", "governador").eq("year", 2026).eq("state", uf).single();
    if (!e2) continue;
    const { count } = await sb.from("candidates").select("id", { count: "exact", head: true }).eq("election_id", e2.id);
    console.log(`  ${uf}: ${count} candidatos`);
  }
})();
