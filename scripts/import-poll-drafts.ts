#!/usr/bin/env npx tsx
/**
 * Fase B — popula poll_drafts a partir de um arquivo JSON pré-extraído
 * (geralmente vindo de WebFetch sobre uma página Wikipedia).
 *
 * Uso:
 *   npx tsx scripts/import-poll-drafts.ts data/wikipedia-presidencial-2026-1t.json \
 *     --election-id=<uuid> --source-url=<wikipedia url> [--apply]
 *
 *   npx tsx scripts/import-poll-drafts.ts <file> \
 *     --election-type=presidente --election-year=2026 --election-round=1 \
 *     --source-url=<wikipedia url> [--apply]
 *
 * Formato esperado do JSON: array de objetos
 *   { institute, fieldwork_start, fieldwork_end, sample_size,
 *     margin_of_error?, results: [{name, pct}] }
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const idx = line.indexOf("="); if (idx > 0) {
    const k = line.slice(0, idx).trim(); const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (k && !process.env[k]) process.env[k] = v;
  }
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const APPLY = process.argv.includes("--apply");
const FILE = process.argv[2];
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");

if (!FILE) { console.error("Uso: import-poll-drafts.ts <file.json> [--election-id=... | --election-type=...] --source-url=..."); process.exit(1); }

async function resolveElection(): Promise<{ id: string; name: string } | null> {
  const id = arg("election-id");
  if (id) {
    const { data } = await sb.from("elections").select("id, name").eq("id", id).maybeSingle();
    return data ?? null;
  }
  const type = arg("election-type"), year = arg("election-year"), state = arg("election-state"), round = arg("election-round");
  if (!type || !year) return null;
  let q = sb.from("elections").select("id, name").eq("type", type).eq("year", parseInt(year));
  if (state) q = q.eq("state", state);
  if (round) q = q.eq("round", parseInt(round));
  const { data } = await q.maybeSingle();
  return data ?? null;
}

(async () => {
  const sourceUrl = arg("source-url") ?? `file://${FILE}`;
  const election = await resolveElection();
  if (!election) { console.error("Eleição não encontrada. Use --election-id ou --election-type=... --election-year=..."); process.exit(1); }
  console.log(`\n📥 Import poll drafts → ${election.name}`);
  console.log(`   Modo: ${APPLY ? "✍️ APPLY" : "🔍 DRY-RUN"}`);

  const raw = JSON.parse(fs.readFileSync(FILE, "utf-8")) as Array<{
    institute: string; fieldwork_start?: string; fieldwork_end: string;
    publication_date?: string | null; sample_size?: number;
    margin_of_error?: number; round?: number;
    results: Array<{ name: string; pct: number }>;
  }>;
  console.log(`   ${raw.length} entradas no arquivo`);

  const drafts = raw.map((r) => ({
    election_id: election.id,
    institute_name: r.institute,
    fieldwork_start: r.fieldwork_start ?? null,
    fieldwork_end: r.fieldwork_end,
    publication_date: r.publication_date ?? r.fieldwork_end,
    sample_size: r.sample_size ?? null,
    margin_of_error: r.margin_of_error ?? null,
    round: r.round ?? 1,
    scope: "1t",
    results: r.results,
    source_url: sourceUrl,
    source_kind: sourceUrl.includes("wikipedia") ? "wikipedia" : "manual",
    status: "pending",
    raw_row: r,
  }));

  if (!APPLY) {
    console.log(`\n   (dry-run; 5 amostras)`);
    for (const d of drafts.slice(0, 5)) {
      console.log(`     ${d.fieldwork_end}  ${d.institute_name.padEnd(22)} n=${String(d.sample_size).padStart(5)} ${d.results.length} cands`);
    }
    return;
  }

  let inserted = 0, updated = 0, errors = 0;
  for (const d of drafts) {
    const { error } = await sb.from("poll_drafts").upsert(d, {
      onConflict: "election_id,institute_name,fieldwork_end,scope,round",
      ignoreDuplicates: false,
    });
    if (error) { console.error(`  ❌ ${d.institute_name} ${d.fieldwork_end}: ${error.message}`); errors++; }
    else inserted++;
  }
  console.log(`\n   ✅ ${inserted} drafts upserted, ${errors} erros`);

  const { count } = await sb.from("poll_drafts").select("id", { count: "exact", head: true }).eq("election_id", election.id);
  console.log(`   📊 Total em poll_drafts para esta eleição: ${count}`);
})();
