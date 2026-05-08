#!/usr/bin/env npx tsx
/**
 * Verifica cobertura Governador 2026:
 *  - 27 elections (uma por UF)
 *  - candidates por UF
 *  - polls + poll_results por UF
 *  - weighted_averages presentes
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

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

(async () => {
  console.log("\n📊 Verificação Governador 2026\n");

  // 1) elections
  const { data: elections, error: e1 } = await sb
    .from("elections")
    .select("id, state, year, type, name")
    .eq("type", "governador")
    .eq("year", 2026);
  if (e1) throw e1;

  const stateToId = new Map<string, string>();
  for (const e of elections ?? []) if (e.state) stateToId.set(e.state, e.id);
  const have = new Set(stateToId.keys());
  const missing = UFS.filter((u) => !have.has(u));

  console.log(`  elections (type=governador, year=2026): ${elections?.length ?? 0} / 27`);
  if (missing.length) console.log(`  ❌ UFs faltando (${missing.length}): ${missing.join(", ")}`);
  else console.log(`  ✅ todas as 27 UFs presentes`);

  // 2) candidates por election
  const electionIds = [...stateToId.values()];
  const { count: candTotal } = await sb
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .in("election_id", electionIds.length ? electionIds : ["00000000-0000-0000-0000-000000000000"]);
  console.log(`\n  candidates (governador 2026): ${candTotal ?? 0} (meta brief: >80)`);

  // breakdown por UF
  const byUf: Record<string, number> = {};
  for (const [uf, eid] of stateToId) {
    const { count } = await sb
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("election_id", eid);
    byUf[uf] = count ?? 0;
  }
  const ufsZero = UFS.filter((u) => (byUf[u] ?? 0) === 0);
  const ufsBaixo = UFS.filter((u) => (byUf[u] ?? 0) > 0 && (byUf[u] ?? 0) < 3);
  console.log(`    UFs com 0 candidatos: ${ufsZero.length} ${ufsZero.length ? `→ ${ufsZero.join(", ")}` : "✅"}`);
  console.log(`    UFs com 1-2 candidatos (subcobertura): ${ufsBaixo.length} ${ufsBaixo.length ? `→ ${ufsBaixo.join(", ")}` : "✅"}`);

  // 3) polls
  const { count: pollTotal } = await sb
    .from("polls")
    .select("id", { count: "exact", head: true })
    .in("election_id", electionIds.length ? electionIds : ["00000000-0000-0000-0000-000000000000"]);
  console.log(`\n  polls (governador 2026): ${pollTotal ?? 0} (meta brief: >50)`);

  const ufsPolls: Record<string, number> = {};
  for (const [uf, eid] of stateToId) {
    const { count } = await sb
      .from("polls")
      .select("id", { count: "exact", head: true })
      .eq("election_id", eid);
    ufsPolls[uf] = count ?? 0;
  }
  const ufsSemPoll = UFS.filter((u) => (ufsPolls[u] ?? 0) === 0);
  console.log(`    UFs sem nenhuma poll: ${ufsSemPoll.length} ${ufsSemPoll.length ? `→ ${ufsSemPoll.join(", ")}` : "✅"}`);

  // 4) weighted_averages
  const { count: waTotal } = await sb
    .from("weighted_averages")
    .select("election_id", { count: "exact", head: true })
    .in("election_id", electionIds.length ? electionIds : ["00000000-0000-0000-0000-000000000000"]);
  const ufsComWA = new Set<string>();
  if (electionIds.length) {
    const { data: waRows } = await sb
      .from("weighted_averages")
      .select("election_id")
      .in("election_id", electionIds);
    for (const r of waRows ?? []) {
      const uf = [...stateToId.entries()].find(([, id]) => id === r.election_id)?.[0];
      if (uf) ufsComWA.add(uf);
    }
  }
  console.log(`\n  weighted_averages: ${waTotal ?? 0} linhas, em ${ufsComWA.size}/${UFS.length} UFs`);

  // tabela final
  console.log(`\n  ╭─ UF  │ cand │ poll │ wa ─╮`);
  for (const uf of UFS) {
    const c = byUf[uf] ?? 0;
    const p = ufsPolls[uf] ?? 0;
    const wa = ufsComWA.has(uf) ? "✓" : "·";
    const flag = !have.has(uf) ? " ❌ sem election" : c === 0 ? " ⚠ sem candidato" : p === 0 ? " ⚠ sem poll" : "";
    console.log(`     ${uf}  │ ${String(c).padStart(4)} │ ${String(p).padStart(4)} │  ${wa}${flag}`);
  }

  // diagnóstico final
  console.log(`\n📋 Diagnóstico:`);
  if (missing.length) console.log(`   • Falta criar ${missing.length} elections: ${missing.join(", ")}`);
  if (ufsZero.length) console.log(`   • ${ufsZero.length} UFs sem candidato → executar seed-governador-data-2026.ts`);
  if (ufsSemPoll.length) console.log(`   • ${ufsSemPoll.length} UFs sem poll → curadoria Wikipedia/Poder360`);
  if (ufsComWA.size < UFS.length - missing.length)
    console.log(`   • Recalcular weighted_averages para ${UFS.length - missing.length - ufsComWA.size} UFs`);
})();
