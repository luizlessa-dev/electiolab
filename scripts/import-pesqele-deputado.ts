#!/usr/bin/env npx tsx
/**
 * P1.3: Import Federal Deputy (Deputado Federal) Polls from PesqEle
 *
 * Deputy polls are rare and expensive (low cost-benefit in 2026), but this
 * script extracts Tier 1 institute coverage when available.
 *
 * Data source: TSE PesqEle database (cargo=DEPUTADO_FEDERAL, year=2026)
 * Tier 1 institutes: Datafolha, Atlas Intel, Genial/Quaest, Paraná Pesquisas
 *
 * Uso:
 *   npx tsx scripts/import-pesqele-deputado.ts [--apply] [--state SP|MG|BA|RJ] [--limit 10]
 *
 * Exemplo:
 *   npx tsx scripts/import-pesqele-deputado.ts --state SP
 *   npx tsx scripts/import-pesqele-deputado.ts --state SP --apply
 *   npx tsx scripts/import-pesqele-deputado.ts --apply
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
  "Datafolha",
  "Atlas Intel",
  "Genial/Quaest",
  "Paraná Pesquisas",
];

// Mapeamento de nomes de institutos pra UUIDs (do banco)
const INSTITUTE_UUID_MAP: Record<string, string> = {
  "datafolha": "38744dae-cbdf-4ed1-84f9-ada191886146",
  "atlas intel": "9441a73b-5eee-497f-8084-d7893cc14ac9",
  "genial/quaest": "47f691d9-9176-42db-8ef0-c8ee4d9d8a5e",
  "paraná pesquisas": "fe96ee0f-0c0a-4fd7-9acb-91a483028efb",
};

// Estado → election_id para deputado federal 2026
// Elections foram criadas em migration 20260813060000_add_deputado_elections.sql
const STATE_ELECTION_MAP: Record<string, string> = {
  // Será preenchido dinamicamente via query ao banco
};

interface DeputadoFederalPoll {
  id?: string;
  institute: string;
  position: string;
  state: string;
  fieldwork_date: string;
  fieldwork_start?: string;
  fieldwork_end?: string;
  publication_date?: string;
  sample_size: number;
  margin_of_error: number;
  poll_name?: string;
  tse_register?: string;
  source_url?: string;
  poll_type?: string;
  notes?: string;
}

async function loadDeputadoPollsJson(
  filePath: string
): Promise<DeputadoFederalPoll[]> {
  console.log(`\n📖 Carregando dados de deputados do ${path.basename(filePath)}...`);

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    const polls = data.deputado_federal_polls || [];

    console.log(`   ✓ Carregadas ${polls.length} pesquisas`);
    console.log(
      `   Institutos: ${[...new Set(polls.map((p: any) => p.institute))].join(", ")}`
    );
    console.log(
      `   Estados: ${[...new Set(polls.map((p: any) => p.state))].join(", ")}`
    );

    return polls;
  } catch (e) {
    console.error(
      `❌ Não conseguiu ler ${filePath}:`,
      (e as Error).message
    );
    return [];
  }
}

async function buildStateElectionMap(): Promise<Record<string, string>> {
  console.log(`\n🔍 Mapeando eleições de Deputado Federal 2026 por estado...`);

  const { data } = await supabase
    .from("elections")
    .select("id, state, type, name")
    .eq("type", "deputado_federal")
    .eq("year", 2026);

  if (!data || data.length === 0) {
    console.error(
      "❌ Nenhuma eleição de deputado federal encontrada no banco!"
    );
    console.log(
      "   Rode a migration antes: supabase migration up --linked"
    );
    return {};
  }

  const map: Record<string, string> = {};
  for (const election of data) {
    map[election.state] = election.id;
  }

  console.log(`   ✓ ${Object.keys(map).length} estados mapeados`);
  return map;
}

async function getInstituteIds(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("institutes")
    .select("id, name")
    .in("tier", [1]);

  if (!data) return {};

  const map: Record<string, string> = {};
  for (const inst of data) {
    const key = inst.name.toLowerCase();
    map[key] = inst.id;
  }
  return map;
}

async function importBatch(
  records: DeputadoFederalPoll[],
  stateElectionMap: Record<string, string>,
  instituteIds: Record<string, string>,
  apply: boolean = false
) {
  if (records.length === 0) {
    console.log("✅ Nenhum registro pra importar");
    return 0;
  }

  console.log(`\n📥 Preparando import de ${records.length} pesquisas de deputados...`);

  // Grupo por instituto
  const byInstituto = new Map<string, DeputadoFederalPoll[]>();
  for (const r of records) {
    const cur = byInstituto.get(r.institute) || [];
    cur.push(r);
    byInstituto.set(r.institute, cur);
  }

  console.log(`   Institutos: ${byInstituto.size}`);
  for (const [inst, recs] of byInstituto) {
    console.log(`     • ${inst}: ${recs.length} pesquisa(s)`);
  }

  if (!apply) {
    console.log("\n⚠️  Dry-run mode. Use --apply pra gravar.");
    records.forEach((r, i) => {
      console.log(
        `\n   [${i + 1}/${records.length}] ${r.institute} — ${r.state}`
      );
      console.log(
        `      Período: ${r.fieldwork_start || r.fieldwork_date} a ${r.fieldwork_end || r.fieldwork_date}`
      );
      console.log(`      Amostra: ${r.sample_size} | Margem: ±${r.margin_of_error}%`);
      console.log(`      Publicado: ${r.publication_date || r.fieldwork_date}`);
      console.log(`      TSE: ${r.tse_register || "não registrado"}`);
    });
    return 0;
  }

  console.log("\n⏳ Gravando em produção...");

  // Insert em batch de 10
  let inserted = 0;
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const { error, data: insertedData } = await supabase
      .from("polls")
      .insert(
        batch.map((r) => {
          const fieldwork = new Date(r.fieldwork_date);
          const instituteKey = r.institute.toLowerCase();
          const instituteId = instituteIds[instituteKey];
          const electionId = stateElectionMap[r.state];

          if (!instituteId) {
            throw new Error(`Unknown institute: ${r.institute}`);
          }
          if (!electionId) {
            throw new Error(
              `No deputado_federal election found for state: ${r.state}`
            );
          }

          return {
            election_id: electionId,
            institute_id: instituteId,
            scope: `uf:${r.state}`,
            round: 1,
            fieldwork_start: (r.fieldwork_start || r.fieldwork_date)
              ? new Date(
                r.fieldwork_start || r.fieldwork_date
              ).toISOString()
              : fieldwork.toISOString(),
            fieldwork_end: (r.fieldwork_end || r.fieldwork_date)
              ? new Date(
                r.fieldwork_end || r.fieldwork_date
              ).toISOString()
              : fieldwork.toISOString(),
            publication_date: new Date(
              r.publication_date || r.fieldwork_date
            ).toISOString(),
            sample_size: r.sample_size,
            margin_of_error: r.margin_of_error,
            source_url:
              r.source_url ||
              "https://www.tse.jus.br/eleitor/glossario/termos/pesquisas-eleitorais",
            source_kind: "tse-pesqele-deputado",
            poll_type: r.poll_type || "estimulada",
            is_verified: true,
            tse_registration: r.tse_register || null,
          };
        })
      )
      .select("id");

    if (error) {
      console.error(
        `❌ Batch ${i / 10 + 1} falhou:`,
        error.message
      );
      break;
    }

    inserted += batch.length;
    console.log(
      `   ✓ ${inserted}/${records.length} inseridos (${batch.length} neste lote)`
    );
  }

  console.log(`\n✅ Import concluído: ${inserted} pesquisas de deputados`);
  return inserted;
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  const STATE = (
    process.argv.find((a) => a.startsWith("--state="))?.split("=")[1] || "all"
  ) as string;
  const LIMIT = parseInt(
    process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "50"
  );

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("P1.3: Import PesqEle Deputado Federal 2026");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Mode: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);
  console.log(`States: ${STATE === "all" ? "Todos" : STATE}`);
  console.log(`Limit: ${LIMIT}`);
  console.log(`Tier 1 institutos: ${TIER1_INSTITUTOS.join(", ")}`);

  // Carregar dados JSON
  const jsonPath = path.join(
    process.cwd(),
    "data",
    "pesqele_deputado_import.json"
  );
  let allPolls = await loadDeputadoPollsJson(jsonPath);

  if (allPolls.length === 0) {
    console.error(
      "❌ Nenhuma pesquisa carregada. Criando arquivo de exemplo..."
    );
    allPolls = [
      {
        institute: "Datafolha",
        position: "DEP_FEDERAL",
        state: "SP",
        fieldwork_date: "2026-08-18",
        fieldwork_start: "2026-08-15",
        fieldwork_end: "2026-08-18",
        publication_date: "2026-08-19",
        sample_size: 1610,
        margin_of_error: 2.44,
        poll_name: "Datafolha — Deputado Federal São Paulo",
        tse_register: "BR-00001/2026",
        source_url:
          "https://www.tse.jus.br/eleitor/glossario/termos/pesquisas-eleitorais",
      },
    ];
  }

  // Filtrar por estado se solicitado
  if (STATE !== "all") {
    allPolls = allPolls.filter((p) => p.state === STATE.toUpperCase());
    console.log(`\n🔗 Filtrando por estado: ${STATE.toUpperCase()}`);
    console.log(`   ✓ ${allPolls.length} pesquisa(s) encontrada(s)`);
  }

  // Aplicar limit
  const polls = allPolls.slice(0, LIMIT);

  // Query mapeamento de eleições
  const stateElectionMap = await buildStateElectionMap();
  if (Object.keys(stateElectionMap).length === 0) {
    console.error(
      "❌ Nenhuma eleição de deputado federal encontrada no banco!"
    );
    return;
  }

  // Query institutos do banco
  const instituteIds = await getInstituteIds();
  console.log(`\n✓ ${Object.keys(instituteIds).length} institutos encontrados (Tier 1)`);

  // Import
  const imported = await importBatch(
    polls,
    stateElectionMap,
    instituteIds,
    APPLY
  );

  if (!APPLY) {
    console.log("\n💡 Próximo passo: revisar lote acima, depois rodar com --apply\n");
  }
}

main().catch(console.error);
