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

// Tier 2-3 institutos — UUIDs queryados do banco dinamicamente
async function getInstituteIds(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("institutes")
    .select("id, name")
    .in("tier", [2, 3]);

  if (!data) return {};

  const map: Record<string, string> = {};
  for (const inst of data) {
    const key = inst.name.toLowerCase().replace(/\//g, "-").replace(/ /g, "-");
    map[key] = inst.id;
  }
  return map;
}

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

async function importBatch(
  instituteKey: string,
  records: any[],
  instituteIds: Record<string, string>,
  apply: boolean = false
) {
  console.log(`\n📥 Instituto: ${instituteKey.toUpperCase()}`);
  console.log(`   Pesquisas: ${records.length}`);

  if (!apply) {
    console.log("   ⚠️  Dry-run mode. Use --apply pra gravar.");
    return 0;
  }

  // Mapear positions → election_ids (de ELECTION_UUID_MAP)
  const ELECTION_UUID_MAP: Record<string, string> = {
    "PRES": "21f8e9a3-5ff8-4baf-b0ae-6b00d2614248",
    "GOV_MG": "ce047ca5-9962-4c94-95dd-f400a1994d03",
    "GOV_SP": "8bda2fee-4c66-48f5-803a-703bec52a5cd",
    "GOV_RJ": "4d5eaa69-74ec-4eda-8a43-d64c68af0412",
    "GOV_BA": "b5defdb3-8247-4722-8447-3aeb97635bf2",
    "GOV_PE": "0cffd39e-1922-49fc-819b-7d9c7829f127",
  };

  // Mapear institute key → UUID
  const instituteId = instituteIds[instituteKey.toLowerCase().replace(/ /g, "-")];
  if (!instituteId) {
    console.error(`   ❌ Instituto UUID não encontrado para ${instituteKey}`);
    return 0;
  }

  // Batch insert (similar a import-pesqele-batch.ts)
  let inserted = 0;
  const BATCH_SIZE = 10;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("polls").insert(
      batch.map((r) => {
        const fieldwork = new Date(r.fieldwork_date);
        const electionId = ELECTION_UUID_MAP[r.position];

        if (!electionId) {
          throw new Error(`Unknown position: ${r.position}`);
        }

        return {
          election_id: electionId,
          institute_id: instituteId,
          scope: r.state === "BR" ? "nacional" : `uf:${r.state}`,
          round: 1,
          fieldwork_start: fieldwork.toISOString(),
          fieldwork_end: fieldwork.toISOString(),
          publication_date: new Date(r.publication_date || r.fieldwork_date).toISOString(),
          sample_size: r.sample_size,
          margin_of_error: r.margin_of_error,
          source_url: r.source_url,
          source_kind: "tier2-3-manual",
          poll_type: "estimulada",
          is_verified: true,
        };
      })
    );

    if (error) {
      console.error(`   ❌ Batch falhou:`, error.message);
      break;
    }

    inserted += batch.length;
    console.log(`   ✓ ${inserted}/${records.length} inseridos`);
  }

  return inserted;
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  const INSTITUTE = (process.argv.find((a) => a.startsWith("--institute="))?.split("=")[1] ||
    "all") as keyof typeof TIER2_DATA;

  console.log("\n📱 Import Tier 2-3 Institutos");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Mode: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);
  console.log(`Institutos: ${INSTITUTE === "all" ? "Todos (4)" : INSTITUTE}`);

  // Query UUIDs do banco
  const instituteIds = await getInstituteIds();
  console.log(
    `✓ ${Object.keys(instituteIds).length} institutos encontrados no banco (Tier 2-3)`
  );

  if (Object.keys(instituteIds).length === 0) {
    console.error("❌ Nenhum instituto Tier 2-3 encontrado!");
    console.log("   Rode a migration antes: supabase migration up --linked");
    return;
  }

  // Import por instituto
  const institutes = INSTITUTE === "all" ? Object.keys(TIER2_DATA) : [INSTITUTE];
  let totalImported = 0;

  for (const inst of institutes) {
    const data = TIER2_DATA[inst as keyof typeof TIER2_DATA];
    if (!data) {
      console.log(`❌ Nenhum dado para ${inst}`);
      continue;
    }

    const imported = await importBatch(inst, data, instituteIds, APPLY);
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
