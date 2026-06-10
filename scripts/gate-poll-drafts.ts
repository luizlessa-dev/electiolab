#!/usr/bin/env npx tsx
/**
 * Portão de verificação ANTES de promover pesquisas extraídas para `polls`.
 *
 * Espelha EXATAMENTE a resolução de candidato/instituto que o endpoint de
 * promoção (src/app/api/admin/poll-drafts/[id]/route.ts) usa, para prever o
 * que vai entrar, o que vai cair em silêncio e o que tem número suspeito.
 *
 * Não escreve nada. Só lê o JSON do extrator + o banco e classifica cada
 * pesquisa em PASS / REVIEW.
 *
 * Uso:
 *   npx tsx scripts/gate-poll-drafts.ts <file.json> --election-id=<uuid>
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const i = line.indexOf("="); if (i > 0) { const k = line.slice(0, i).trim(); const v = line.slice(i + 1).trim().replace(/^"|"$/g, ""); if (k && !process.env[k]) process.env[k] = v; }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const FILE = process.argv[2];
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const ELECTION = arg("election-id");
if (!FILE || !ELECTION) { console.error("Uso: gate-poll-drafts.ts <file.json> --election-id=<uuid>"); process.exit(1); }

// idêntico ao route de promoção
const normalize = (s: string) => s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const squash = (s: string) => normalize(s).replace(/\s+/g, "");

(async () => {
  const [{ data: cands }, { data: insts }] = await Promise.all([
    sb.from("candidates").select("name, full_name").eq("election_id", ELECTION).eq("is_active", true),
    sb.from("institutes").select("name"),
  ]);
  const matchCand = (raw: string): boolean => {
    const t = normalize(raw);
    return (cands ?? []).some((c) => { const cn = normalize(c.name); const cf = normalize(c.full_name ?? ""); return cn.includes(t) || t.includes(cn) || (cf && cf.includes(t)); });
  };
  const matchInst = (raw: string): boolean => { const t = squash(raw); return (insts ?? []).some((i) => { const n = squash(i.name); return n.includes(t) || t.includes(n); }); };

  const polls = JSON.parse(fs.readFileSync(FILE, "utf-8")) as Array<{ institute: string; fieldwork_end: string | null; results: { name: string; pct: number }[]; _sum?: number; scenario?: string | null }>;

  let pass = 0, review = 0;
  for (const p of polls) {
    const issues: string[] = [];
    if (!matchInst(p.institute)) issues.push(`instituto não casa: "${p.institute}"`);
    const missing = p.results.filter((r) => !matchCand(r.name)).map((r) => r.name);
    if (missing.length) issues.push(`nomes sem candidato (${missing.length}): ${missing.join(", ")}`);
    const droppedPct = p.results.filter((r) => !matchCand(r.name)).reduce((a, r) => a + r.pct, 0);
    if (droppedPct >= 3) issues.push(`⚠ ${droppedPct.toFixed(1)}pp cairiam em silêncio`);
    if (!p.fieldwork_end) issues.push("sem data de campo");
    const sum = p.results.reduce((a, r) => a + r.pct, 0);
    if (sum > 100.5) issues.push(`soma de candidatos ${sum.toFixed(1)}% > 100`);

    const ok = issues.length === 0;
    if (ok) pass++; else review++;
    const tag = ok ? "✅ PASS  " : "🔶 REVIEW";
    console.log(`${tag} ${(p.fieldwork_end ?? "????")}  ${p.institute.padEnd(20)} ${String(p.results.length).padStart(2)}c sum=${sum.toFixed(1)}%${p.scenario ? ` cen${p.scenario}` : ""}`);
    for (const is of issues) console.log(`           └ ${is}`);
  }
  console.log(`\n  ${pass} PASS · ${review} REVIEW · ${polls.length} total`);
})();
