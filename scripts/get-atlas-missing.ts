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
  // Pesquisas de Atlas Intel no TSE entre 2026-08-19 e 2026-09-11
  const { data: tseRegistrations, error: tseError } = await sb
    .from("pesqele_missing")
    .select("protocolo, uf, cargos, instituto, fieldwork_end, sample_size")
    .ilike("instituto", "%atlas%")
    .gte("fieldwork_end", "2026-08-19")
    .lte("fieldwork_end", "2026-09-11")
    .order("fieldwork_end", { ascending: false });

  if (tseError) {
    console.error("Erro ao ler pesqele_missing:", tseError.message);
    process.exit(1);
  }

  const registros = (tseRegistrations as any[]) ?? [];
  console.log(`\nAtlas Intel entre 2026-08-19 e 2026-09-11: ${registros.length} registros\n`);

  for (const r of registros) {
    console.log(
      `${r.fieldwork_end} | ${r.uf.padEnd(2)} | ${r.cargos.slice(0, 25).padEnd(25)} | n=${String(r.sample_size).padStart(5)} | ${r.protocolo}`
    );
  }

  // Exporta JSON
  const outPath = "/private/tmp/atlas-missing.json";
  fs.writeFileSync(outPath, JSON.stringify(registros, null, 2));
  console.log(`\n✅ Exportado para: ${outPath}`);
}

main().catch(e => {
  console.error("Erro:", e.message);
  process.exit(1);
});
