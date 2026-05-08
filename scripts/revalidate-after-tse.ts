#!/usr/bin/env npx tsx
/**
 * Pós-ingest TSE: revalida landings SEO (path=ALL) + páginas de candidato
 * cujos slugs apareceram em prior_election_results.
 *
 * Uso:
 *   npx tsx scripts/revalidate-after-tse.ts                 # produção
 *   npx tsx scripts/revalidate-after-tse.ts --base=http://localhost:3000
 */
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TOKEN = process.env.REVALIDATE_TOKEN!;
const BASE = process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "https://electiolab.com";
const THROTTLE_MS = 150;

if (!TOKEN) throw new Error("REVALIDATE_TOKEN ausente em .env.local");

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function revalidate(p: string): Promise<{ ok: boolean; status: number; body: string }> {
  const url = `${BASE}/api/revalidate?path=${encodeURIComponent(p)}&token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url, { method: "POST" });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 200) };
}

async function loadAffectedSlugs(): Promise<string[]> {
  const slugs = new Set<string>();
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from("prior_election_results")
      .select("candidate:candidates(slug)")
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const c = row.candidate as { slug?: string } | { slug?: string }[] | null;
      const slug = Array.isArray(c) ? c[0]?.slug : c?.slug;
      if (slug) slugs.add(slug);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  return [...slugs].sort();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`\n🔁 Revalidate after TSE ingest`);
  console.log(`   Base: ${BASE}`);

  // 1) ALL paths
  console.log(`\n[1/2] path=ALL (landings SEO + 27 UFs governador)`);
  const all = await revalidate("ALL");
  console.log(`   → ${all.status} ${all.ok ? "OK" : "FAIL"} ${all.body}`);

  // 2) candidate slugs com histórico
  console.log(`\n[2/2] candidatos com prior_election_results`);
  const slugs = await loadAffectedSlugs();
  console.log(`   → ${slugs.length} slugs únicos`);

  let ok = 0, fail = 0;
  const failed: string[] = [];
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const r = await revalidate(`/candidato/${slug}`);
    if (r.ok) ok++;
    else { fail++; failed.push(`${slug} [${r.status}] ${r.body}`); }
    if ((i + 1) % 25 === 0 || i === slugs.length - 1) {
      console.log(`   ${i + 1}/${slugs.length}  ok=${ok} fail=${fail}`);
    }
    await sleep(THROTTLE_MS);
  }

  if (failed.length) {
    console.log(`\n❌ Falhas (${failed.length}):`);
    for (const f of failed.slice(0, 20)) console.log(`   - ${f}`);
    if (failed.length > 20) console.log(`   ... +${failed.length - 20}`);
  }

  console.log(`\n✅ Concluído: ALL + ${ok}/${slugs.length} candidatos`);
})();
