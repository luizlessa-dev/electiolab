#!/usr/bin/env npx tsx
/**
 * Análise de gaps por instituto — TOP 10 maiores lacunas
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PAGE_SIZE = 1000;

async function getAllPages(from: string, select: string): Promise<any[]> {
  const all: any[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data } = await sb.from(from).select(select).range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
  }
  return all;
}

async function main() {
  console.log("📊 Análise de Gaps por Instituto — TOP 10\n");

  // Coletar todos os registros
  const polls = await getAllPages("polls", "institute_id,institutes(name)");
  const missing = await getAllPages("pesqele_missing", "instituto,cargos");
  const missingSenador = await getAllPages("pesqele_missing_senador", "instituto");

  // Mapear instituto_id para nome em polls
  const pollsByInst = new Map<string, number>();
  for (const p of polls) {
    const inst = (p.institutes?.name || "Unknown").toLowerCase();
    pollsByInst.set(inst, (pollsByInst.get(inst) ?? 0) + 1);
  }

  // Contar pendências por tipo de eleição
  type InstStat = { [type: string]: number };
  const pendingByInst = new Map<string, InstStat>();

  for (const m of missing) {
    const inst = (m.instituto || "Unknown").toLowerCase();
    const type = m.cargos?.includes("Presidente") ? "Presidencial" :
                  m.cargos?.includes("Governador") ? "Governador" :
                  m.cargos?.includes("Senador") ? "Senador" :
                  m.cargos?.includes("Deputado") ? "Deputado" : "Outro";
    
    if (!pendingByInst.has(inst)) {
      pendingByInst.set(inst, {});
    }
    const stat = pendingByInst.get(inst)!;
    stat[type] = (stat[type] ?? 0) + 1;
  }

  for (const m of missingSenador) {
    const inst = (m.instituto || "Unknown").toLowerCase();
    if (!pendingByInst.has(inst)) {
      pendingByInst.set(inst, {});
    }
    const stat = pendingByInst.get(inst)!;
    stat["Senador"] = (stat["Senador"] ?? 0) + 1;
  }

  // Calcular gaps
  type Gap = {
    instituto: string;
    covered: number;
    pending: number;
    total: number;
    pctGap: number;
    byType: InstStat;
  };

  const gaps: Gap[] = [];
  const allInsts = new Set([...pollsByInst.keys(), ...pendingByInst.keys()]);

  for (const inst of allInsts) {
    const covered = pollsByInst.get(inst) ?? 0;
    const stat = pendingByInst.get(inst) ?? {};
    const pending = Object.values(stat).reduce((a: number, b: number) => a + b, 0);
    const total = covered + pending;
    
    if (pending > 0) {
      gaps.push({
        instituto: inst,
        covered,
        pending,
        total,
        pctGap: (pending / total) * 100,
        byType: stat,
      });
    }
  }

  gaps.sort((a, b) => b.pending - a.pending);

  // Exibir TOP 10
  console.log("Instituto | Tipo | Prontas | Em espera | Total % | Esforço estimado");
  console.log("---|---|---|---|---|---");

  for (const gap of gaps.slice(0, 10)) {
    const inst = gap.instituto.slice(0, 25).padEnd(25);
    
    // Estimar esforço
    let esforco = "manual (press releases)";
    if (gap.instituto.includes("deputado")) {
      esforco = "scraping (sem padrão)";
    }
    
    const byTypeStr = Object.entries(gap.byType)
      .map(([t, c]) => `${t.slice(0,3)}:${c}`)
      .join(" ");
    
    const pct = gap.pctGap.toFixed(0);
    console.log(
      `${inst} | ${byTypeStr.padEnd(15)} | ${String(gap.covered).padStart(3)} | ${String(gap.pending).padStart(3)} | ${String(pct).padStart(3)}% | ${esforco}`
    );
  }

  // Resumo
  const totalPending = gaps.reduce((a, g) => a + g.pending, 0);
  console.log(`\n📈 Resumo: ${gaps.length} institutos com gaps, ${totalPending} pesquisas não ingeridas`);
  console.log(`   TOP 10 sozinhos: ${gaps.slice(0, 10).reduce((a, g) => a + g.pending, 0)} pesquisas (${(gaps.slice(0, 10).reduce((a, g) => a + g.pending, 0) / totalPending * 100).toFixed(1)}% do total)`);
}

main().catch(e => {
  console.error("Erro:", e);
  process.exit(1);
});
