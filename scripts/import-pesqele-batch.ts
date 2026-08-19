#!/usr/bin/env node
/**
 * P1.2: Batch import de pesquisas faltantes do PesqEle TSE
 *
 * Uso:
 *   npx ts-node scripts/import-pesqele-batch.ts [--apply] [--limit N] [--position PRES|GOV|SEN|DEP]
 *
 * Exemplo:
 *   npx ts-node scripts/import-pesqele-batch.ts --position PRES --limit 50
 *   npx ts-node scripts/import-pesqele-batch.ts --position PRES --limit 50 --apply
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

// Tier 1: institutos reputados com dados publicados
const TIER1_INSTITUTOS = [
  "Genial/Quaest",
  "Nexus",
  "Datafolha",
  "Quaest",
  "Atlas Intel",
  "BTG Pactual",
  "Paraná Pesquisas",
];

// Mapeamento de nomes de institutos pra UUIDs (do banco)
const INSTITUTE_UUID_MAP: Record<string, string> = {
  "datafolha": "38744dae-cbdf-4ed1-84f9-ada191886146",
  "genial/quaest": "47f691d9-9176-42db-8ef0-c8ee4d9d8a5e",
  "nexus": "f7b6c037-0909-4f94-b99a-1b38a624fb12",
  "atlas intel": "9441a73b-5eee-497f-8084-d7893cc14ac9",
  "paraná pesquisas": "fe96ee0f-0c0a-4fd7-9acb-91a483028efb",
};

// Mapeamento de posições/estados pra election_id (do banco)
const ELECTION_UUID_MAP: Record<string, string> = {
  "PRES": "21f8e9a3-5ff8-4baf-b0ae-6b00d2614248",
  "GOV_MG": "ce047ca5-9962-4c94-95dd-f400a1994d03",
  "GOV_SP": "8bda2fee-4c66-48f5-803a-703bec52a5cd",
  "GOV_RJ": "4d5eaa69-74ec-4eda-8a43-d64c68af0412",
  "GOV_BA": "b5defdb3-8247-4722-8447-3aeb97635bf2",
  "GOV_PE": "0cffd39e-1922-49fc-819b-7d9c7829f127",
};

interface PesqEleRecord {
  tse_id?: string;
  institute: string;
  position: string;
  state: string;
  fieldwork_date: string;
  publication_date?: string;
  source_url?: string;
  candidate_1_name?: string;
  candidate_1_votes?: number;
  candidate_2_name?: string;
  candidate_2_votes?: number;
  sample_size: number;
  margin_of_error: number;
  poll_name?: string;
}

async function getPesqEleFaltantes(position: string, limit: number) {
  console.log(`\n🔍 Carregando pesquisas faltantes de ${position}...`);

  // Ler do JSON preparado pelo agent
  const jsonPath = path.join(process.cwd(), "data", "pesqele_import_lote1.json");

  let data: any = { lote1: [] };
  try {
    const content = fs.readFileSync(jsonPath, "utf-8");
    data = JSON.parse(content);
  } catch (e) {
    console.error(`❌ Não conseguiu ler ${jsonPath}:`, (e as Error).message);
    return [];
  }

  const faltantes = data.lote1 || [];
  console.log(`   ✓ Carregadas ${faltantes.length} pesquisas do JSON`);
  return faltantes.slice(0, limit);
}

async function importBatch(records: PesqEleRecord[], apply: boolean = false) {
  if (records.length === 0) {
    console.log("✅ Nenhum registro pra importar");
    return;
  }

  console.log(`\n📥 Preparando import de ${records.length} pesquisas...`);

  // Grupo por instituto
  const byInstituto = new Map<string, PesqEleRecord[]>();
  for (const r of records) {
    const cur = byInstituto.get(r.institute) || [];
    cur.push(r);
    byInstituto.set(r.institute, cur);
  }

  console.log(`   Institutos: ${byInstituto.size}`);
  for (const [inst, recs] of byInstituto) {
    console.log(`     - ${inst}: ${recs.length} pesquisas`);
  }

  if (!apply) {
    console.log("\n⚠️  Dry-run mode. Use --apply pra gravar.");
    return;
  }

  console.log("\n⏳ Gravando em produção...");

  // Insert em batch de 10
  let inserted = 0;
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const { error } = await supabase.from("polls").insert(
      batch.map((r) => {
        const fieldwork = new Date(r.fieldwork_date);
        const instituteKey = r.institute.toLowerCase();
        const instituteId = INSTITUTE_UUID_MAP[instituteKey];
        const electionId = ELECTION_UUID_MAP[r.position];

        if (!instituteId) {
          throw new Error(`Unknown institute: ${r.institute}`);
        }
        if (!electionId) {
          throw new Error(`Unknown position: ${r.position}`);
        }

        return {
          election_id: electionId,
          institute_id: instituteId,
          scope: r.state === "BR" ? "nacional" : `uf:${r.state}`,
          round: 1, // 1º turno = 1, 2º turno = 2
          fieldwork_start: fieldwork.toISOString(),
          fieldwork_end: fieldwork.toISOString(),
          publication_date: new Date(r.publication_date || r.fieldwork_date).toISOString(),
          sample_size: r.sample_size,
          margin_of_error: r.margin_of_error,
          source_url: r.source_url || "https://www.tse.jus.br/eleitor/glossario/termos/pesquisas-eleitorais",
          source_kind: "tse-pesqele",
          poll_type: "estimulada",
          is_verified: true,
        };
      })
    );

    if (error) {
      console.error(`❌ Batch ${i / 10 + 1} falhou:`, error.message);
      break;
    }

    inserted += batch.length;
    console.log(`   ✓ ${inserted}/${records.length} inseridos`);
  }

  console.log(`\n✅ Import concluído: ${inserted} pesquisas`);
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  const POSITION = (process.argv.find((a) => a.startsWith("--position="))?.split("=")[1] ||
    "PRES") as "PRES" | "GOV" | "SEN" | "DEP";
  const LIMIT = parseInt(
    process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "50"
  );

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("P1.2: Batch Import PesqEle TSE 2026");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Position: ${POSITION}, Limit: ${LIMIT}, Apply: ${APPLY}`);
  console.log(`Tier 1 institutos: ${TIER1_INSTITUTOS.join(", ")}`);

  const faltantes = await getPesqEleFaltantes(POSITION, LIMIT);
  await importBatch(faltantes, APPLY);

  if (!APPLY) {
    console.log("\n💡 Próximo passo: revisar lote acima, depois rodar com --apply");
  }
}

main().catch(console.error);
