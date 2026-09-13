#!/usr/bin/env npx tsx

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

async function main() {
  // Pesquisas de Atlas Intel e Paraná Pesquisas no TSE até 2026-09-13
  const { data: tseRegistrations, error: tseError } = await sb
    .from("pesqele_missing")
    .select("protocolo, uf, cargos, instituto, fieldwork_end, sample_size")
    .or("instituto.ilike.%atlas%,instituto.ilike.%paraná%")
    .gte("fieldwork_end", "2026-08-19")
    .lte("fieldwork_end", "2026-09-13")
    .order("fieldwork_end", { ascending: false });

  if (tseError) {
    console.error("Erro ao ler pesqele_missing:", tseError.message);
    process.exit(1);
  }

  const registros = (tseRegistrations as any[]) ?? [];
  const atlasIntel = registros.filter(r => r.instituto.toLowerCase().includes("atlas"));
  const paranaPesquisas = registros.filter(r => r.instituto.toLowerCase().includes("paraná"));

  console.log(`\nAtlas Intel (2026-08-19 a 2026-09-13): ${atlasIntel.length} registros`);
  console.log(`Paraná Pesquisas (2026-08-19 a 2026-09-13): ${paranaPesquisas.length} registros`);
  console.log(`Total: ${registros.length} registros\n`);

  // Mostra os totais
  const atlasFirst = atlasIntel[0];
  const paranaFirst = paranaPesquisas[0];
  if (atlasFirst) console.log(`Atlas Intel mais recente: ${atlasFirst.fieldwork_end}`);
  if (paranaFirst) console.log(`Paraná Pesquisas mais recente: ${paranaFirst.fieldwork_end}`);
}

main().catch(e => {
  console.error("Erro:", e.message);
  process.exit(1);
});
