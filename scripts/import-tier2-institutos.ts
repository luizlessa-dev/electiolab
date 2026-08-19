#!/usr/bin/env npx tsx
/**
 * P1.2 Fase 2 — Import Tier 2-3 Institutos
 *
 * Institutos investigados pelo agent:
 * - GERP: 9 pesquisas (pres + RJ gov)
 * - MEIO/IDEIA: 8 pesquisas (pres, mensal)
 * - VOX BRASIL: 5 pesquisas (pres)
 * - REAL TIME BIG DATA: 4+ pres + 4+ gov (RJ, Paraná, DF)
 *
 * Total: +22-30 pesquisas → 123-126 total (50% cobertura)
 *
 * Uso:
 *   npx tsx scripts/import-tier2-institutos.ts --apply
 *   npx tsx scripts/import-tier2-institutos.ts --institute GERP --limit 10
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Tier 2-3 institutos mapeados do agent report
const TIER2_INSTITUTES: Record<string, string> = {
  "gerp": "gerp-pesquisas-uuid",  // TODO: query DB pra UUID real
  "meio-ideia": "meio-ideia-uuid",
  "vox-brasil": "vox-brasil-uuid",
  "real-time-big-data": "real-time-big-data-uuid",
};

// Dados mock até temos CSV real (agent vai mapear do TSE)
const TIER2_DATA = {
  gerp: [
    {
      institute: "GERP",
      position: "PRES",
      state: "BR",
      fieldwork_date: "2026-08-10",
      publication_date: "2026-08-15",
      sample_size: 1500,
      margin_of_error: 2.5,
      source_url: "https://www.gerp.com.br/eleitoral.html",
    },
    // ... 8 mais
  ],
  "meio-ideia": [
    {
      institute: "MEIO/IDEIA",
      position: "PRES",
      state: "BR",
      fieldwork_date: "2026-08-05",
      publication_date: "2026-08-12",
      sample_size: 1200,
      margin_of_error: 2.8,
      source_url: "https://www.canalmeio.com.br/pesquisa-meio-ideia/",
    },
    // ... 7 mais
  ],
  "vox-brasil": [
    {
      institute: "VOX BRASIL",
      position: "PRES",
      state: "BR",
      fieldwork_date: "2026-08-08",
      publication_date: "2026-08-14",
      sample_size: 1000,
      margin_of_error: 3.0,
      source_url: "https://voxbrasilpesquisas.com.br/",
    },
    // ... 4 mais
  ],
  "real-time-big-data": [
    {
      institute: "REAL TIME BIG DATA",
      position: "PRES",
      state: "BR",
      fieldwork_date: "2026-08-06",
      publication_date: "2026-08-13",
      sample_size: 800,
      margin_of_error: 3.5,
      source_url: "https://www.realtimedata.com.br/pesquisa-politica/",
    },
    {
      institute: "REAL TIME BIG DATA",
      position: "GOV_RJ",
      state: "RJ",
      fieldwork_date: "2026-08-09",
      publication_date: "2026-08-15",
      sample_size: 600,
      margin_of_error: 4.0,
      source_url: "https://www.realtimedata.com.br/pesquisa-politica/",
    },
    // ... 2-3 mais
  ],
};

async function queryInstituteIds(): Promise<Record<string, string>> {
  console.log("🔍 Consultando UUIDs de institutos no banco...");
  const { data: institutes } = await supabase
    .from("institutes")
    .select("id, name")
    .in("name", Object.keys(TIER2_INSTITUTES).map((k) => k.replace("-", " ")));

  if (!institutes) {
    console.error(
      "❌ Nenhum instituto Tier 2-3 encontrado. Precisa criar registros manualmente."
    );
    console.log("\n   Comando para registrar institutos:");
    console.log(
      "   INSERT INTO institutes (name, tier) VALUES ('GERP', 2), ('MEIO/IDEIA', 2), ('VOX BRASIL', 2), ('REAL TIME BIG DATA', 2);"
    );
    return {};
  }

  const map: Record<string, string> = {};
  for (const inst of institutes) {
    const key = inst.name.toLowerCase().replace(/ /g, "-");
    map[key] = inst.id;
  }
  return map;
}

async function importBatch(
  instituteKey: string,
  records: any[],
  apply: boolean = false
) {
  console.log(`\n📥 Instituto: ${instituteKey.toUpperCase()}`);
  console.log(`   Pesquisas: ${records.length}`);

  if (!apply) {
    console.log("   ⚠️  Dry-run mode. Use --apply pra gravar.");
    return 0;
  }

  // TODO: Map positions → election_ids
  // TODO: Map institutos → UUIDs (via queryInstituteIds)
  // TODO: Batch insert como em import-pesqele-batch.ts

  console.log("   [TODO] Implementar upsert em 'polls' table");
  return 0;
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  const INSTITUTE = (process.argv.find((a) => a.startsWith("--institute="))?.split("=")[1] ||
    "all") as keyof typeof TIER2_DATA;

  console.log("\n📱 Import Tier 2-3 Institutos");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Mode: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);
  console.log(`Institutos: ${INSTITUTE === "all" ? "Todos (4)" : INSTITUTE}`);

  // Query UUIDs
  const instituteIds = await queryInstituteIds();
  console.log(
    `✓ ${Object.keys(instituteIds).length} institutos encontrados no banco`
  );

  // Import por instituto
  const institutes = INSTITUTE === "all" ? Object.keys(TIER2_DATA) : [INSTITUTE];
  let totalImported = 0;

  for (const inst of institutes) {
    const data = TIER2_DATA[inst as keyof typeof TIER2_DATA];
    if (!data) {
      console.log(`❌ Nenhum dado para ${inst}`);
      continue;
    }

    const imported = await importBatch(inst, data, APPLY);
    totalImported += imported;
  }

  console.log(`\n✅ Total importado: ${totalImported} pesquisas`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (!APPLY) {
    console.log(
      "💡 Próximo: revisar amostra, depois rodar com --apply\n"
    );
  }
}

main().catch(console.error);
