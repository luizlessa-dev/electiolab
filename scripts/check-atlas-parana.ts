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
  // Pesquisas de Atlas Intel e Paraná Pesquisas no TSE
  const { data: tseRegistrations, error: tseError } = await sb
    .from("pesqele_missing")
    .select("protocolo, uf, cargos, instituto, fieldwork_end, sample_size")
    .or("instituto.ilike.%atlas%,instituto.ilike.%paraná%")
    .order("fieldwork_end", { ascending: false });

  if (tseError) {
    console.error("Erro ao ler pesqele_missing:", tseError.message);
    process.exit(1);
  }

  console.log("\n=== ATLAS INTEL + PARANÁ PESQUISAS NO TSE (pesqele_missing) ===");
  console.log(`Total: ${(tseRegistrations as any[])?.length ?? 0} registros\n`);

  // Grupos por instituto
  const atlasIntel = (tseRegistrations as any[])?.filter((r: any) => 
    r.instituto.toLowerCase().includes("atlas")
  ) ?? [];
  const paranaPesquisas = (tseRegistrations as any[])?.filter((r: any) => 
    r.instituto.toLowerCase().includes("paraná")
  ) ?? [];

  console.log(`Atlas Intel: ${atlasIntel.length}`);
  console.log(`Paraná Pesquisas: ${paranaPesquisas.length}`);
  console.log(`\nDetalhes por data (últimas 20):`);
  
  const combined = [...atlasIntel, ...paranaPesquisas]
    .sort((a, b) => new Date(b.fieldwork_end).getTime() - new Date(a.fieldwork_end).getTime())
    .slice(0, 20);

  for (const r of combined) {
    console.log(
      `  ${r.fieldwork_end} | ${r.instituto.slice(0, 25).padEnd(25)} | ${r.cargos.slice(0, 20).padEnd(20)} | n=${r.sample_size} | ${r.protocolo}`
    );
  }

  // Agora verifica quantas já foram inseridas no banco de dados
  console.log("\n=== PESQUISAS JÁ NO BANCO (polls) ===");
  const { data: existingPolls, error: pollsError } = await sb
    .from("polls")
    .select("id, institute_name, publication_date, fieldwork_end, tse_registration")
    .or("institute_name.ilike.%atlas%,institute_name.ilike.%paraná%")
    .order("fieldwork_end", { ascending: false });

  if (pollsError) {
    console.error("Erro ao ler polls:", pollsError.message);
  }

  const atlasInBanco = (existingPolls as any[])?.filter((r: any) => 
    r.institute_name.toLowerCase().includes("atlas")
  ) ?? [];
  const paranaBanco = (existingPolls as any[])?.filter((r: any) => 
    r.institute_name.toLowerCase().includes("paraná")
  ) ?? [];

  console.log(`Atlas Intel no banco: ${atlasInBanco.length}`);
  console.log(`Paraná Pesquisas no banco: ${paranaBanco.length}`);

  console.log(`\n=== RESUMO ===`);
  console.log(`Atlas Intel: ${atlasIntel.length} no TSE vs ${atlasInBanco.length} no banco = ${atlasIntel.length - atlasInBanco.length} faltando`);
  console.log(`Paraná Pesquisas: ${paranaPesquisas.length} no TSE vs ${paranaBanco.length} no banco = ${paranaPesquisas.length - paranaBanco.length} faltando`);
}

main().catch(e => {
  console.error("Erro:", e.message);
  process.exit(1);
});
