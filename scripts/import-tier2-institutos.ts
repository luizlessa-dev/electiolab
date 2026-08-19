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

// Carregar dados reais do JSON extraído pelo agent
async function loadTier2Data(): Promise<Record<string, any[]>> {
  const dataPath = path.join(process.cwd(), "data", "tier2-pesquisas-2026.json");

  try {
    const content = fs.readFileSync(dataPath, "utf-8");
    const data = JSON.parse(content);

    // Remover metadados (metadata, validacoes, resumo_por_instituto)
    const filtered: Record<string, any[]> = {};
    for (const key of Object.keys(data)) {
      if (!["metadata", "validacoes", "resumo_por_instituto"].includes(key)) {
        filtered[key] = data[key];
      }
    }

    return filtered;
  } catch (e) {
    console.error(`❌ Erro ao carregar dados: ${(e as Error).message}`);
    console.log(`   Arquivo esperado: data/tier2-pesquisas-2026.json`);
    return {};
  }
}

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
    // Filtrar registros com posição válida
    const validRecords = batch.filter((r) => {
      const hasDate = r.fieldwork_start || r.fieldwork_date;
      const hasElection = ELECTION_UUID_MAP[r.position];
      if (!hasElection) {
        console.log(`   ⚠️  Ignorando ${r.institute} ${r.position} (eleição não mapeada)`);
      }
      return hasDate && hasElection;
    });

    if (validRecords.length === 0) {
      console.log(`   ⚠️  Nenhum registro válido neste batch`);
      inserted += batch.length; // Contar como inserido (mas não inseriu nada)
      continue;
    }

    const { error } = await supabase.from("polls").insert(
      validRecords.map((r) => {
        // Aceitar fieldwork_start ou fieldwork_date
        const fieldworkStart = r.fieldwork_start || r.fieldwork_date;
        const fieldworkEnd = r.fieldwork_end || r.fieldwork_date;

        const electionId = ELECTION_UUID_MAP[r.position];
        if (!electionId) {
          throw new Error(`Unknown position: ${r.position}`);
        }

        return {
          election_id: electionId,
          institute_id: instituteId,
          scope: r.state === "BR" ? "nacional" : `uf:${r.state}`,
          round: 1,
          fieldwork_start: new Date(fieldworkStart).toISOString(),
          fieldwork_end: new Date(fieldworkEnd).toISOString(),
          publication_date: new Date(r.publication_date).toISOString(),
          sample_size: r.sample_size,
          margin_of_error: r.margin_of_error,
          source_url: r.source_url,
          source_kind: "tier2-3-real",
          poll_type: "estimulada",
          is_verified: true,
        };
      })
    );

    if (error) {
      console.error(`   ❌ Batch falhou:`, error.message);
      break;
    }

    inserted += validRecords.length;
    console.log(`   ✓ ${inserted}/${records.length} inseridos`);
  }

  return inserted;
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  const INSTITUTE = process.argv.find((a) => a.startsWith("--institute="))?.split("=")[1] || "all";

  console.log("\n📱 Import Tier 2-3 Institutos");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Mode: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);
  console.log(`Institutos: ${INSTITUTE === "all" ? "Todos (carregando...)" : INSTITUTE}`);

  // Carregar dados reais do JSON
  const tier2Data = await loadTier2Data();
  if (Object.keys(tier2Data).length === 0) {
    console.error("❌ Nenhum dado encontrado no arquivo tier2-pesquisas-2026.json");
    return;
  }

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
  const institutes = INSTITUTE === "all" ? Object.keys(tier2Data) : [INSTITUTE];
  let totalImported = 0;

  for (const inst of institutes) {
    const data = tier2Data[inst];
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
