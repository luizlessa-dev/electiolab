#!/usr/bin/env npx tsx
/**
 * Análise de gaps de cobertura de pesquisas
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ── Env ──────────────────────────────────────────────────────────────────────
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

async function fetchAllRows(view: string): Promise<any[]> {
  const PAGE = 1000;
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from(view)
      .select("*")
      .range(from, from + PAGE - 1);

    if (error) {
      console.error(`❌ erro ao ler ${view}:`, error.message);
      process.exit(1);
    }

    const page = (data ?? []) as any[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

async function main() {
  console.log("📊 Analisando cobertura de pesquisas...\n");
  
  // Pesquisas registradas (TSE)
  const tseRows = await fetchAllRows("pesqele");
  console.log(`Total de pesquisas registradas no TSE: ${tseRows.length}`);
  
  // Pesquisas com resultados curados
  const pollRows = await fetchAllRows("polls");
  console.log(`Total de pesquisas com resultados curados: ${pollRows.length}`);
  
  // Pesquisas pendentes
  const missingRows = await fetchAllRows("pesqele_missing");
  console.log(`Total de pesquisas pendentes: ${missingRows.length}`);
  
  const missingRowsSenador = await fetchAllRows("pesqele_missing_senador");
  console.log(`Total de pesquisas pendentes (Senador): ${missingRowsSenador.length}\n`);
  
  // Análise por instituto e cargo
  type GapRow = {
    protocolo: string;
    uf: string;
    cargos: string;
    instituto: string;
    fieldwork_end: string;
  };
  
  const gapsByInstitutoCargo = new Map<string, number>();
  const totalByInstitutoCargo = new Map<string, number>();
  
  // Contar os registrados no TSE
  for (const row of tseRows) {
    const instituto = row.instituto || "unknown";
    const cargos = row.cargos || "unknown";
    const key = `${instituto}|${cargos}`;
    totalByInstitutoCargo.set(key, (totalByInstitutoCargo.get(key) ?? 0) + 1);
  }
  
  // Contar os pendentes
  for (const row of missingRows) {
    const instituto = row.instituto || "unknown";
    const cargos = row.cargos || "unknown";
    const key = `${instituto}|${cargos}`;
    gapsByInstitutoCargo.set(key, (gapsByInstitutoCargo.get(key) ?? 0) + 1);
  }
  
  for (const row of missingRowsSenador) {
    const instituto = row.instituto || "unknown";
    const key = `${instituto}|Senador`;
    gapsByInstitutoCargo.set(key, (gapsByInstitutoCargo.get(key) ?? 0) + 1);
  }
  
  // Calcular TOP 10 gaps
  const gaps = Array.from(gapsByInstitutoCargo.entries())
    .map(([key, pending]) => {
      const total = totalByInstitutoCargo.get(key) ?? 0;
      const [instituto, cargo] = key.split("|");
      return { instituto, cargo, pending, total, covered: total - pending };
    })
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 10);
  
  console.log("🔴 TOP 10 GAPS (maior volume não ingerido):\n");
  console.log("Instituto | Tipo | Prontas | Em espera | % Gap | Esforço estimado");
  console.log("---|---|---|---|---|---");
  
  for (const gap of gaps) {
    const pct = ((gap.pending / gap.total) * 100).toFixed(0);
    // Estimar esforço baseado no tipo de eleição e instituto
    let esforco = "médio";
    if (gap.cargo === "Presidente" || gap.cargo === "Governador") {
      esforco = "manual (releases de press)";
    } else if (gap.cargo.includes("Deputado")) {
      esforco = "scraping (sem formato padrão)";
    }
    
    console.log(`${gap.instituto.slice(0, 30).padEnd(30)} | ${gap.cargo} | ${gap.covered} | ${gap.pending} | ${pct}% | ${esforco}`);
  }
  
  // Institutos com dados estruturados prontos
  console.log("\n🟢 Institutos com dados estruturados:\n");
  
  const REPUTABLE_TOKENS = [
    "datafolha", "quaest", "atlas", "poderdata", "poder data", "ipespe", "ipec",
    "parana pesquisas", "real time", "mda", "nexus", "futura", "vox brasil",
    "gerp", "meio", "ideia", "fsb", "verita", "seculus", "neokemp", "vetor",
  ];
  
  function isReputable(instituto: string): boolean {
    const norm = instituto.toLowerCase();
    return REPUTABLE_TOKENS.some((t) => norm.includes(t));
  }
  
  const reputables = new Set<string>();
  for (const row of tseRows) {
    if (isReputable(row.instituto)) {
      reputables.add(row.instituto);
    }
  }
  
  console.log(`${reputables.size} institutos reputados identificados (com releases de press estruturados):`);
  for (const inst of Array.from(reputables).sort()) {
    const total = tseRows.filter(r => r.instituto === inst).length;
    const covered = pollRows.filter(r => r.institute === inst).length;
    const pending = total - covered;
    console.log(`  • ${inst}: ${covered}/${total} curadas (${pending} pendentes)`);
  }
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
