#!/usr/bin/env npx tsx
/**
 * Análise de gaps de cobertura — agrupa por instituto/tipo/status
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
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fetchAllRows(query: any): Promise<any[]> {
  const PAGE = 1000;
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const q = query.range(from, from + PAGE - 1);
    const { data, error } = await q;

    if (error) {
      console.error(`❌ erro:`, error.message);
      process.exit(1);
    }

    const page = (data ?? []) as any[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

async function main() {
  console.log("📊 Cobertura de Pesquisas — Análise de Gaps\n");
  
  // Dados curados
  const pollRows = await fetchAllRows(sb.from("polls").select("institute, office"));
  
  // Dados registrados mas não curados
  const missingRows = await fetchAllRows(sb.from("pesqele_missing").select("instituto, cargos"));
  const missingSenador = await fetchAllRows(sb.from("pesqele_missing_senador").select("instituto"));

  type Stat = { covered: number; pending: number };
  type Gap = { instituto: string; cargo: string; covered: number; pending: number; esforco: string };
  
  const stats = new Map<string, Stat>();
  
  // Count curadas
  for (const row of pollRows) {
    const inst = (row.institute || "Unknown").toLowerCase();
    const office = row.office || "Unknown";
    const key = `${inst}|${office}`;
    const cur = stats.get(key) ?? { covered: 0, pending: 0 };
    cur.covered++;
    stats.set(key, cur);
  }
  
  // Count pendentes
  for (const row of missingRows) {
    const inst = (row.instituto || "Unknown").toLowerCase();
    const cargos = row.cargos || "Unknown";
    const key = `${inst}|${cargos}`;
    const cur = stats.get(key) ?? { covered: 0, pending: 0 };
    cur.pending++;
    stats.set(key, cur);
  }
  
  for (const row of missingSenador) {
    const inst = (row.instituto || "Unknown").toLowerCase();
    const key = `${inst}|Senador`;
    const cur = stats.get(key) ?? { covered: 0, pending: 0 };
    cur.pending++;
    stats.set(key, cur);
  }
  
  // Top 10 gaps
  const gaps: Gap[] = Array.from(stats.entries())
    .map(([key, stat]) => {
      const [instituto, cargo] = key.split("|");
      let esforco = "médio (releases)";
      if (cargo.includes("Deputado")) {
        esforco = "alto (scraping)";
      } else if (cargo === "Senador") {
        esforco = "médio-alto";
      }
      return { instituto, cargo, covered: stat.covered, pending: stat.pending, esforco };
    })
    .filter(g => g.pending > 0)
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 10);
  
  console.log("🔴 TOP 10 GAPS DE COBERTURA:\n");
  console.log("Instituto | Tipo | Prontas | Em espera | Total % | Esforço");
  console.log("---|---|---|---|---|---");
  
  for (const gap of gaps) {
    const total = gap.covered + gap.pending;
    const pct = ((gap.pending / total) * 100).toFixed(0);
    console.log(`${gap.instituto.slice(0, 20).padEnd(20)} | ${gap.cargo.padEnd(15)} | ${String(gap.covered).padStart(3)} | ${String(gap.pending).padStart(3)} | ${String(pct).padStart(3)}% | ${gap.esforco}`);
  }
  
  console.log(`\n📈 Total curado: ${pollRows.length} resultados`);
  console.log(`📉 Total pendente: ${missingRows.length + missingSenador.length} resultados`);
}

main().catch(e => {
  console.error("Erro:", e);
  process.exit(1);
});
