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

interface PesqEleRecord {
  tse_id: string;
  institute: string;
  position: string;
  state: string;
  fieldwork_date: string;
  candidate_1_name: string;
  candidate_1_votes: number;
  candidate_2_name?: string;
  candidate_2_votes?: number;
  sample_size: number;
  margin_of_error: number;
}

async function getPesqEleFaltantes(position: string, limit: number) {
  console.log(`\n🔍 Buscando pesquisas faltantes para ${position}...`);

  // Simular busca do CSV do TSE
  // Em produção, isso viria de:
  // 1. Download ZIP do TSE
  // 2. Parse CSV
  // 3. Cross-reference com banco

  const faltantes: PesqEleRecord[] = [];

  console.log(`   Found ${faltantes.length} registros faltantes`);
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
      batch.map((r) => ({
        poll_name: `${r.institute} — ${r.position} ${r.state}`,
        institute_id: r.institute.toLowerCase().replace("/", "-"),
        position: r.position,
        state: r.state,
        electoral_phase: "1º turno",
        year: 2026,
        fieldwork_start: new Date(r.fieldwork_date),
        fieldwork_end: new Date(r.fieldwork_date),
        sample_size: r.sample_size,
        margin_of_error: r.margin_of_error,
        source_url: `https://www.tse.jus.br/eleitor/glossario/termos/pesquisas-eleitorais`,
        reviewed_by: "import-pesqele-batch.ts",
      }))
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
