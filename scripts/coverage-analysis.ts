#!/usr/bin/env npx tsx
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

(async () => {
  console.log(`\n📊 ANÁLISE COMPLETA DE COBERTURA PESQELE 2026\n`);

  // Total por cargo
  const { data: coverage } = await sb
    .from("pesqele_coverage")
    .select("*");

  if (!coverage) {
    console.log("❌ Erro ao buscar cobertura");
    return;
  }

  // Agregar por cargo
  const byCargo: Record<string, { total: number; covered: number; pct: number }> = {};
  for (const row of coverage) {
    if (!byCargo[row.cargo]) {
      byCargo[row.cargo] = { total: 0, covered: 0, pct: 0 };
    }
    byCargo[row.cargo].total += row.total_tse;
    byCargo[row.cargo].covered += row.on_electiolab;
  }

  console.log("1. COBERTURA POR CARGO (agregado):");
  console.log(`   Cargo            | Total TSE | Cobertos | Cobertura %`);
  console.log(`   -----------------+-----------+----------+-----------`);
  
  for (const [cargo, data] of Object.entries(byCargo).sort()) {
    data.pct = data.total === 0 ? 0 : (100 * data.covered / data.total);
    const pct = data.pct.toFixed(1);
    console.log(`   ${cargo.padEnd(16)} | ${String(data.total).padEnd(9)} | ${String(data.covered).padEnd(8)} | ${pct}%`);
  }

  const totalTse = Object.values(byCargo).reduce((a, b) => a + b.total, 0);
  const totalCovered = Object.values(byCargo).reduce((a, b) => a + b.covered, 0);
  const totalPct = totalTse === 0 ? 0 : (100 * totalCovered / totalTse).toFixed(1);
  
  console.log(`   -----------------+-----------+----------+-----------`);
  console.log(`   TOTAL            | ${String(totalTse).padEnd(9)} | ${String(totalCovered).padEnd(8)} | ${totalPct}%`);

  // Top institutos
  console.log(`\n2. TOP 20 INSTITUTOS NO TSE (2026):`);
  const { data: allRegs } = await sb
    .from("pesqele_registry")
    .select("nome_empresa")
    .eq("ano", 2026);

  if (allRegs) {
    const institutos: Record<string, number> = {};
    for (const row of allRegs) {
      const inst = row.nome_empresa;
      institutos[inst] = (institutos[inst] || 0) + 1;
    }
    
    console.log(`   Instituto                             | Pesquisas`);
    console.log(`   ------+----+---+----+---+----+---+---+---+----------`);
    Object.entries(institutos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([inst, count]) => {
        console.log(`   ${inst.substring(0, 35).padEnd(35)} | ${count}`);
      });
  }

  // Institutos sem cobertura
  console.log(`\n3. INSTITUTOS SEM COBERTURA (0% em polls):`);
  const { data: byInst } = await sb
    .from("pesqele_registry")
    .select("nome_empresa")
    .eq("ano", 2026);
  
  if (byInst) {
    // Get institutes with coverage
    const { data: pollInsts } = await sb
      .from("polls")
      .select("institute_id")
      .not("institute_id", "is", null);
    
    const covered = new Set<string>();
    if (pollInsts) {
      // Buscar nomes via polls
      const { data: instNames } = await sb
        .from("institutes")
        .select("*");
      if (instNames) {
        for (const inst of instNames) {
          if (pollInsts.some(p => p.institute_id === inst.id)) {
            covered.add(inst.name);
          }
        }
      }
    }
    
    const uncovered: Record<string, number> = {};
    for (const row of byInst) {
      if (!covered.has(row.nome_empresa)) {
        uncovered[row.nome_empresa] = (uncovered[row.nome_empresa] || 0) + 1;
      }
    }
    
    console.log(`   Instituto                             | Pesquisas | Status`);
    console.log(`   ------+----+---+----+---+----+---+---+---+----------+`);
    Object.entries(uncovered)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([inst, count]) => {
        console.log(`   ${inst.substring(0, 35).padEnd(35)} | ${count}`);
      });
  }

  // Comparação com 2024 e 2022
  console.log(`\n4. TENDÊNCIA HISTÓRICA (TSE vs ElectioLab):`);
  for (const year of [2022, 2024, 2026]) {
    const { data: regs } = await sb
      .from("pesqele_registry")
      .select("*", { count: "exact" })
      .eq("ano", year);
    
    const { data: polls } = await sb
      .from("elections")
      .select("polls(id)", { count: "exact" })
      .gte("year", year)
      .lt("year", year + 1);
    
    const tseCount = regs?.length || 0;
    const pollCount = polls?.length || 0;
    const pct = tseCount === 0 ? 0 : (100 * pollCount / tseCount).toFixed(1);
    
    console.log(`   ${year} | TSE: ${String(tseCount).padEnd(5)} | ElectioLab: ${String(pollCount).padEnd(5)} | ${pct}%`);
  }
})();
