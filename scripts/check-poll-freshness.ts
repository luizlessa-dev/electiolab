#!/usr/bin/env npx tsx
/** Verifica recência das pesquisas por eleição ativa. */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs"; import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const idx = line.indexOf("="); if (idx > 0) {
    const k = line.slice(0, idx).trim(); const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (k && !process.env[k]) process.env[k] = v;
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const TODAY = new Date();
const daysAgo = (d: string) => Math.floor((TODAY.getTime() - new Date(d).getTime()) / 86400000);

(async () => {
  const { data: elections } = await sb
    .from("elections")
    .select("id, name, type, state, year, round, is_active")
    .eq("is_active", true)
    .eq("year", 2026)
    .order("type, state");
  if (!elections) { console.log("no elections"); return; }

  // Pegar polls em lote (1 query)
  const ids = elections.map((e) => e.id);
  const { data: polls } = await sb
    .from("polls")
    .select("election_id, publication_date, fieldwork_end, institute:institutes(name)")
    .in("election_id", ids)
    .order("publication_date", { ascending: false });

  const lastByElection = new Map<string, { pub: string; fw: string | null; institute: string }>();
  const countByElection = new Map<string, number>();
  for (const p of polls ?? []) {
    countByElection.set(p.election_id, (countByElection.get(p.election_id) ?? 0) + 1);
    if (!lastByElection.has(p.election_id)) {
      const inst = Array.isArray(p.institute) ? p.institute[0] : p.institute;
      lastByElection.set(p.election_id, {
        pub: p.publication_date,
        fw: p.fieldwork_end,
        institute: inst?.name ?? "?",
      });
    }
  }

  // Agrupa por tipo
  const groups: Record<string, typeof elections> = {};
  for (const e of elections) {
    const k = e.type;
    if (!groups[k]) groups[k] = [];
    groups[k].push(e);
  }

  for (const [type, es] of Object.entries(groups)) {
    console.log(`\n━━━ ${type.toUpperCase()} (${es.length} eleições) ━━━`);
    let fresh = 0, stale30 = 0, stale60 = 0, stale90 = 0, none = 0;
    const sorted = es.sort((a, b) => {
      const la = lastByElection.get(a.id)?.pub ?? "0000";
      const lb = lastByElection.get(b.id)?.pub ?? "0000";
      return la.localeCompare(lb);
    });
    for (const e of sorted) {
      const last = lastByElection.get(e.id);
      const count = countByElection.get(e.id) ?? 0;
      if (!last) {
        none++;
        console.log(`  ${(e.state ?? "BR").padEnd(3)} R${e.round}  ❌ SEM PESQUISA       count=${count}`);
        continue;
      }
      const days = daysAgo(last.pub);
      const tag = days > 90 ? "🟥 >90d " : days > 60 ? "🟧 >60d " : days > 30 ? "🟨 >30d " : "🟩 ≤30d ";
      if (days > 90) stale90++;
      else if (days > 60) stale60++;
      else if (days > 30) stale30++;
      else fresh++;
      console.log(`  ${(e.state ?? "BR").padEnd(3)} R${e.round}  ${tag} ${last.pub} (${days}d) ${last.institute.padEnd(22)} count=${count}`);
    }
    console.log(`     resumo: ${fresh} ≤30d · ${stale30} 30-60d · ${stale60} 60-90d · ${stale90} >90d · ${none} sem poll`);
  }

  // Eleições inativas com polls — sanity check
  console.log(`\n━━━ ELEIÇÕES INATIVAS COM POLLS (sanity check) ━━━`);
  const { data: inactivePolls } = await sb
    .from("polls")
    .select("election:elections(name, is_active, year)")
    .limit(500);
  const inactive = (inactivePolls ?? []).filter((p) => {
    const e = Array.isArray(p.election) ? p.election[0] : p.election;
    return e && !e.is_active;
  }).length;
  console.log(`  ${inactive} polls em eleições is_active=false`);
})();
