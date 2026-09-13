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
  // Busca institutos
  const { data: institutes } = await sb
    .from("institutes")
    .select("id, name")
    .in("name", ["Atlas Intel", "Paraná Pesquisas"]);

  if (!institutes || institutes.length === 0) {
    console.log("❌ Institutos não encontrados");
    process.exit(1);
  }

  const institutesMap = new Map(institutes.map((i: any) => [i.name, i.id]));

  // Conta pesquisas de Atlas Intel e Paraná Pesquisas
  const instIds = Array.from(institutesMap.values());

  const { data: allPolls, error: allError } = await sb
    .from("polls")
    .select("id, institute_id, fieldwork_end, publication_date", { count: "exact" })
    .in("institute_id", instIds)
    .gte("fieldwork_end", "2026-08-19")
    .lte("fieldwork_end", "2026-09-13");

  if (allError) {
    console.error("Erro ao ler polls:", allError.message);
    process.exit(1);
  }

  const allCount = (allPolls as any[])?.length ?? 0;

  // Separa por instituto
  const atlasPolls = (allPolls as any[])?.filter(p => p.institute_id === institutesMap.get("Atlas Intel")) ?? [];
  const paranaPolls = (allPolls as any[])?.filter(p => p.institute_id === institutesMap.get("Paraná Pesquisas")) ?? [];

  console.log(`\n✅ VERIFICAÇÃO DE INGESTÃO`);
  console.log(`Atlas Intel (2026-08-19 a 2026-09-13): ${atlasPolls.length} pesquisas`);
  console.log(`Paraná Pesquisas (2026-08-19 a 2026-09-13): ${paranaPolls.length} pesquisas`);
  console.log(`Total: ${allCount} pesquisas\n`);

  if (atlasPolls.length > 0) {
    const dates = new Set(atlasPolls.map(p => p.fieldwork_end));
    console.log(`Datas de fieldwork Atlas Intel:`);
    Array.from(dates).sort().reverse().forEach(d => console.log(`  - ${d}`));
  }

  // Sumário
  console.log(`\n📊 Status: ${allCount > 0 ? "✅ Ingestão confirmada" : "⚠️ Nenhuma pesquisa encontrada"}`);
}

main().catch(e => {
  console.error("Erro:", e.message);
  process.exit(1);
});
