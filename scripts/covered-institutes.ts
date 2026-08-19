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
  console.log(`\n📋 INSTITUTOS COM COBERTURA EM POLLS (2026)\n`);

  // Buscar polls com tse_registration preenchido
  const { data: pollsWithTse } = await sb
    .from("polls")
    .select("tse_registration, institute_id")
    .not("tse_registration", "is", null);
  
  if (!pollsWithTse) {
    console.log("❌ Erro ao buscar polls");
    return;
  }

  // Contar matches
  console.log(`   Polls com tse_registration preenchido: ${pollsWithTse.length}`);
  
  // Buscar institutos dos polls
  const instIds = [...new Set(pollsWithTse.map(p => p.institute_id))];
  console.log(`   Institutos distintos: ${instIds.length}`);
  
  if (instIds.length > 0) {
    const { data: insts } = await sb
      .from("institutes")
      .select("*")
      .in("id", instIds);
    
    if (insts) {
      console.log(`\n   Instituto (com cobertura TSE)          | Polls`);
      console.log(`   ------+----+---+----+---+----+---+---+---+-------`);
      const byInst: Record<string, number> = {};
      for (const poll of pollsWithTse) {
        const inst = insts.find(i => i.id === poll.institute_id);
        if (inst) {
          byInst[inst.name] = (byInst[inst.name] || 0) + 1;
        }
      }
      
      Object.entries(byInst)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => {
          console.log(`   ${name.substring(0, 35).padEnd(35)} | ${count}`);
        });
    }
  }

  // Estatísticas de source_kind
  console.log(`\n   DISTRIBUIÇÃO POR PROVENIÊNCIA (source_kind):`);
  const { data: bySource } = await sb
    .from("polls")
    .select("source_kind", { count: "exact" });
  
  if (bySource) {
    const sources: Record<string, number> = {};
    for (const row of bySource) {
      const source = row.source_kind || "null";
      sources[source] = (sources[source] || 0) + 1;
    }
    
    for (const [source, count] of Object.entries(sources).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${source.padEnd(15)} | ${count}`);
    }
  }
})();
