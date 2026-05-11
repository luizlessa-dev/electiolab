#!/usr/bin/env npx tsx
/**
 * SEO Drift — captura baselines de elementos SEO críticos das rotas-chave
 * e diffa contra snapshot anterior. Versionado em tools/seo-baselines/.
 *
 * Substituto leve para skills externas. Sem deps além de Node built-ins.
 *
 * Uso:
 *   npx tsx scripts/seo-drift.ts capture          # captura baseline novo
 *   npx tsx scripts/seo-drift.ts diff             # diff entre os 2 mais recentes
 *   npx tsx scripts/seo-drift.ts diff a.json b.json
 *   npx tsx scripts/seo-drift.ts list             # lista snapshots
 *
 * Snapshots gravados em tools/seo-baselines/YYYY-MM-DDTHH-MM-SS.json.
 */
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const BASE = process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "https://electiolab.com";
const BASELINES_DIR = path.join(process.cwd(), "tools", "seo-baselines");
const ROUTES = [
  "/",
  "/sobre",
  "/imprensa",
  "/api",
  "/sancoes",
  "/cota-parlamentar",
  "/patrimonio",
  "/fefc",
  "/redes-sociais",
  "/pesquisas-presidenciais-2026",
  "/quem-vence-no-segundo-turno-presidencia-2026",
  "/instituto-mais-acurado-eleicoes-brasil",
  "/quanto-custa-campanha-eleitoral-google-ads-meta",
  "/eleicao-2018",
  "/eleicao-2022",
  "/eleicao-2018/sp",
  "/eleicao-2022/sp",
  "/eleicoes-governador-sp-2026",
  "/eleicoes-governador-mg-2026",
  "/eleicoes-governador-rj-2026",
  "/eleicoes-governador-rs-2026",
  "/institutos",
  "/candidatos",
  "/precos",
  "/openapi.yaml",
];

type Snapshot = {
  url: string;
  status: number;
  title: string | null;
  meta_description: string | null;
  canonical: string | null;
  meta_robots: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  og: Record<string, string>;
  json_ld_count: number;
  json_ld_types: string[];
  html_size: number;
  html_hash: string;
};

type Baseline = {
  base: string;
  captured_at: string;
  snapshots: Snapshot[];
};

function extract(html: string, regex: RegExp, group = 1): string | null {
  const m = html.match(regex);
  return m ? m[group].trim() : null;
}

function extractAll(html: string, regex: RegExp, group = 1): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
  while ((m = r.exec(html)) !== null) out.push(m[group].trim());
  return out;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function snapshot(url: string): Promise<Snapshot> {
  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (e) {
    return {
      url, status: 0, title: null, meta_description: null, canonical: null,
      meta_robots: null, h1: [], h2: [], h3: [], og: {}, json_ld_count: 0,
      json_ld_types: [], html_size: 0, html_hash: "",
    };
  }
  const html = await res.text();

  const og: Record<string, string> = {};
  const ogMatches = html.matchAll(/<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']*)["']/gi);
  for (const m of ogMatches) og[m[1]] = m[2];

  // JSON-LD types
  const ldBlocks = extractAll(html, /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const types = new Set<string>();
  for (const b of ldBlocks) {
    try {
      const json = JSON.parse(b);
      const collect = (n: { "@type"?: string | string[]; "@graph"?: unknown[] }) => {
        const t = n?.["@type"];
        if (typeof t === "string") types.add(t);
        else if (Array.isArray(t)) for (const x of t) types.add(x);
        if (Array.isArray(n?.["@graph"])) for (const sub of n["@graph"]) collect(sub as Parameters<typeof collect>[0]);
      };
      if (Array.isArray(json)) for (const j of json) collect(j);
      else collect(json);
    } catch {}
  }

  return {
    url,
    status: res.status,
    title: extract(html, /<title[^>]*>([^<]+)<\/title>/i),
    meta_description: extract(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i),
    canonical: extract(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i),
    meta_robots: extract(html, /<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i),
    h1: extractAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(stripTags),
    h2: extractAll(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi).map(stripTags).slice(0, 20),
    h3: extractAll(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi).map(stripTags).slice(0, 30),
    og,
    json_ld_count: ldBlocks.length,
    json_ld_types: [...types].sort(),
    html_size: html.length,
    html_hash: crypto.createHash("sha256").update(html).digest("hex").slice(0, 16),
  };
}

async function capture() {
  fs.mkdirSync(BASELINES_DIR, { recursive: true });
  console.log(`\n📸 Capturing baseline of ${ROUTES.length} routes against ${BASE}...\n`);
  const snapshots: Snapshot[] = [];
  for (const r of ROUTES) {
    const url = BASE + r;
    process.stdout.write(`  ${r.padEnd(60)} `);
    const s = await snapshot(url);
    snapshots.push(s);
    const tag = s.status === 200 ? "✅" : s.status === 0 ? "❌" : `⚠ ${s.status}`;
    console.log(`${tag}  ${s.title?.slice(0, 50) ?? ""}`);
  }
  const out: Baseline = {
    base: BASE,
    captured_at: new Date().toISOString(),
    snapshots,
  };
  const fname = out.captured_at.replace(/[:.]/g, "-") + ".json";
  const fpath = path.join(BASELINES_DIR, fname);
  fs.writeFileSync(fpath, JSON.stringify(out, null, 2));
  console.log(`\n💾 ${fpath}`);
  console.log(`   ${snapshots.filter((s) => s.status === 200).length}/${ROUTES.length} routes 200 OK`);
}

function loadBaselines(): { file: string; data: Baseline }[] {
  if (!fs.existsSync(BASELINES_DIR)) return [];
  return fs
    .readdirSync(BASELINES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => ({
      file: f,
      data: JSON.parse(fs.readFileSync(path.join(BASELINES_DIR, f), "utf-8")),
    }));
}

function diffLists(a: string[], b: string[]): { added: string[]; removed: string[] } {
  const sa = new Set(a), sb = new Set(b);
  return { added: [...sb].filter((x) => !sa.has(x)), removed: [...sa].filter((x) => !sb.has(x)) };
}

function diffSnapshots(a: Snapshot, b: Snapshot): string[] {
  const issues: string[] = [];
  if (a.status !== b.status) issues.push(`🚨 status: ${a.status} → ${b.status}`);
  if (a.title !== b.title) issues.push(`⚠ title changed: "${a.title}" → "${b.title}"`);
  if (a.meta_description !== b.meta_description) issues.push(`⚠ meta description changed`);
  if (a.canonical !== b.canonical) issues.push(`🚨 canonical: ${a.canonical} → ${b.canonical}`);
  if (a.meta_robots !== b.meta_robots) issues.push(`🚨 robots: ${a.meta_robots} → ${b.meta_robots}`);
  if (a.h1.join("|") !== b.h1.join("|")) issues.push(`⚠ H1: ${JSON.stringify(a.h1)} → ${JSON.stringify(b.h1)}`);

  const h2Diff = diffLists(a.h2, b.h2);
  if (h2Diff.added.length || h2Diff.removed.length) {
    issues.push(`ℹ H2 changes: +${h2Diff.added.length} -${h2Diff.removed.length}`);
  }
  if (a.json_ld_count !== b.json_ld_count) {
    issues.push(`⚠ JSON-LD count: ${a.json_ld_count} → ${b.json_ld_count}`);
  }
  const ldDiff = diffLists(a.json_ld_types, b.json_ld_types);
  if (ldDiff.added.length || ldDiff.removed.length) {
    issues.push(`⚠ JSON-LD types: +${ldDiff.added.join(",")} -${ldDiff.removed.join(",")}`);
  }
  if (a.html_hash !== b.html_hash) {
    const pctChange = Math.abs(a.html_size - b.html_size) / Math.max(a.html_size, 1) * 100;
    if (pctChange > 30) issues.push(`⚠ HTML size changed ${pctChange.toFixed(0)}% (${a.html_size} → ${b.html_size})`);
  }
  return issues;
}

function diff(aFile?: string, bFile?: string) {
  const all = loadBaselines();
  if (all.length < 2 && !aFile) {
    console.log(`Precisa de pelo menos 2 baselines em ${BASELINES_DIR}. Atual: ${all.length}.`);
    return;
  }
  const a = aFile ? all.find((x) => x.file === aFile) : all[all.length - 2];
  const b = bFile ? all.find((x) => x.file === bFile) : all[all.length - 1];
  if (!a || !b) { console.log("Snapshots não encontrados."); return; }

  console.log(`\n🔍 Diff: ${a.file} → ${b.file}\n`);
  const byUrlA = new Map(a.data.snapshots.map((s) => [s.url, s]));
  const byUrlB = new Map(b.data.snapshots.map((s) => [s.url, s]));
  const urls = new Set([...byUrlA.keys(), ...byUrlB.keys()]);

  let total = 0;
  for (const u of [...urls].sort()) {
    const sa = byUrlA.get(u), sb = byUrlB.get(u);
    if (!sa) { console.log(`➕ NEW   ${u}`); total++; continue; }
    if (!sb) { console.log(`➖ REMOVED ${u}`); total++; continue; }
    const issues = diffSnapshots(sa, sb);
    if (issues.length) {
      console.log(`\n  ${u}`);
      for (const i of issues) console.log(`    ${i}`);
      total += issues.length;
    }
  }
  console.log(`\n${total === 0 ? "✅ Nenhuma mudança detectada." : `${total} mudanças detectadas.`}`);
}

function list() {
  const all = loadBaselines();
  console.log(`\n${all.length} baselines em ${BASELINES_DIR}:\n`);
  for (const { file, data } of all) {
    const ok = data.snapshots.filter((s) => s.status === 200).length;
    console.log(`  ${file}  →  ${ok}/${data.snapshots.length} 200, base=${data.base}`);
  }
}

const cmd = process.argv[2];
if (cmd === "capture") capture();
else if (cmd === "diff") diff(process.argv[3], process.argv[4]);
else if (cmd === "list") list();
else {
  console.log(`Uso:\n  npx tsx scripts/seo-drift.ts capture\n  npx tsx scripts/seo-drift.ts diff [oldFile.json] [newFile.json]\n  npx tsx scripts/seo-drift.ts list`);
  process.exit(1);
}
