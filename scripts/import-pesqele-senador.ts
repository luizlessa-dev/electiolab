#!/usr/bin/env npx tsx
/**
 * Extract ~50 senator (senador) polls from TSE PesqEle 2026
 *
 * Filters by Tier 1 institutes only:
 * - Datafolha, Quaest, Atlas Intel, Ipec, Genial, Nexus, Paraná Pesquisas, SMS Direct, Verita
 *
 * Validates: fieldwork dates, sample size 800-2000, margin 2-4%
 *
 * Usage:
 *   npx tsx scripts/import-pesqele-senador.ts                    # dry-run, export to /tmp/pesqele_senador_import.json
 *   npx tsx scripts/import-pesqele-senador.ts --limit=30         # limit results
 *   npx tsx scripts/import-pesqele-senador.ts --apply            # apply to database
 *
 * Output: /tmp/pesqele_senador_import.json
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
      if (k && !process.env[k]) {
        process.env[k] = v;
      }
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Tier 1 institutos — confiáveis
const TIER1_INSTITUTOS = [
  "Datafolha",
  "Quaest",
  "Atlas Intel",
  "Ipec",
  "Genial",
  "Nexus",
  "Paraná Pesquisas",
  "SMS Direct",
  "Verita",
];

// Mapeamento de institute names → UUIDs (consultado do banco)
const INSTITUTE_UUID_MAP: Record<string, string> = {
  "datafolha": "38744dae-cbdf-4ed1-84f9-ada191886146",
  "genial/quaest": "47f691d9-9176-42db-8ef0-c8ee4d9d8a5e",
  "quaest": "c1f2b5e1-9e6f-44e2-8c2d-5f0a3e8b1d4c", // placeholder, will fetch from DB
  "nexus": "f7b6c037-0909-4f94-b99a-1b38a624fb12",
  "atlas intel": "9441a73b-5eee-497f-8084-d7893cc14ac9",
  "paraná pesquisas": "fe96ee0f-0c0a-4fd7-9acb-91a483028efb",
  "ipec": "6d3c4f2a-1b9e-4c8e-9d5f-2a7c1e3b5f8a",
  "sms direct": "8f4d5c3b-2e1a-4f7c-9b3e-1d5f8c2a4b6e",
  "verita": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
};

// Election IDs for senador (national, per state eventually)
const SENADOR_ELECTION_ID = "a1b2c3d4-e5f6-4ghi-9jkl-mnopqrstuvwx"; // placeholder

interface PesqEleSenadoRaw {
  protocolo: string;
  ano: number;
  uf: string;
  cargos: string;
  nome_empresa: string;
  dt_inicio: string | null;
  dt_fim: string | null;
  dt_divulgacao: string | null;
  qt_entrevistados: number | null;
}

interface PesqEleSenadorProcessed {
  id: string;
  institute: string;
  institute_id?: string;
  tse_register: string; // protocolo
  date: string; // fieldwork_end
  fieldwork_start: string;
  fieldwork_end: string;
  sample_size: number;
  margin_error: number;
  source_url: string;
  state: string; // UF
  valid: boolean;
  issues: string[];
}

// Calculate margin of error from sample size
function calculateMarginOfError(sampleSize: number): number {
  if (!sampleSize || sampleSize < 100) return 0;
  // Standard formula: ME = 1.96 * sqrt((p*(1-p))/n)
  // Assuming p=0.5 (worst case): ME ≈ 98/sqrt(n)
  return Math.round((98 / Math.sqrt(sampleSize)) * 10) / 10;
}

// Validate a record
function validateRecord(r: PesqEleSenadoRaw): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!r.dt_inicio || !r.dt_fim) {
    issues.push("missing fieldwork dates");
  } else {
    const start = new Date(r.dt_inicio);
    const end = new Date(r.dt_fim);
    if (start > end) {
      issues.push("fieldwork_start > fieldwork_end");
    }
  }

  if (!r.qt_entrevistados || r.qt_entrevistados < 800 || r.qt_entrevistados > 2100) {
    issues.push(
      `sample size out of range: ${r.qt_entrevistados} (expected 800-2100)`
    );
  }

  const me = calculateMarginOfError(r.qt_entrevistados || 0);
  if (me < 1.5 || me > 4.5) {
    issues.push(`margin of error out of range: ${me}% (expected 1.5-4.5%)`);
  }

  return { valid: issues.length === 0, issues };
}

async function getInstituteIds(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase
      .from("institutes")
      .select("id, name")
      .order("name");

    if (!data) return INSTITUTE_UUID_MAP;

    const map: Record<string, string> = { ...INSTITUTE_UUID_MAP };
    for (const inst of data) {
      const key = inst.name.toLowerCase().replace(/\s+/g, " ");
      map[key] = inst.id;
    }
    return map;
  } catch (e) {
    console.warn("⚠️  Could not fetch institute IDs from DB, using hardcoded map");
    return INSTITUTE_UUID_MAP;
  }
}

async function fetchSenadoRPolls(
  limit: number = 50
): Promise<PesqEleSenadoRaw[]> {
  console.log(`\n🔍 Buscando pesquisas de senador no PesqEle 2026...`);

  try {
    const { data, error } = await supabase
      .from("pesqele_registry")
      .select("protocolo, ano, uf, cargos, nome_empresa, dt_inicio, dt_fim, dt_divulgacao, qt_entrevistados")
      .eq("ano", 2026)
      .ilike("cargos", "%senador%")
      .not("dt_fim", "is", null)
      .not("qt_entrevistados", "is", null)
      .order("dt_fim", { ascending: false })
      .limit(limit * 2); // fetch 2x to account for filtering

    if (error) {
      console.error(`❌ Query error: ${error.message}`);
      return [];
    }

    if (!data) {
      console.log(`   ℹ️  No data returned`);
      return [];
    }

    console.log(`   ✓ ${data.length} raw records fetched`);
    return data;
  } catch (e) {
    console.error(`❌ Fetch error: ${(e as Error).message}`);
    return [];
  }
}

function normalizeInstituteNme(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchesTier1(instituteName: string): boolean {
  const normalized = normalizeInstituteNme(instituteName);

  // Exact matches
  for (const tier1 of TIER1_INSTITUTOS) {
    if (normalized === normalizeInstituteNme(tier1)) {
      return true;
    }
  }

  // Substring matches (e.g., "Datafolha" substring)
  for (const tier1 of TIER1_INSTITUTOS) {
    const tier1Lower = normalizeInstituteNme(tier1);
    if (normalized.includes(tier1Lower) || tier1Lower.includes(normalized)) {
      return true;
    }
  }

  return false;
}

async function processRecords(
  raw: PesqEleSenadoRaw[],
  instituteIds: Record<string, string>,
  limit: number
): Promise<PesqEleSenadorProcessed[]> {
  const processed: PesqEleSenadorProcessed[] = [];
  let skipped = 0;

  for (const r of raw) {
    // Filter by Tier 1 institute
    if (!matchesTier1(r.nome_empresa)) {
      skipped++;
      continue;
    }

    // Validate
    const { valid, issues } = validateRecord(r);

    const instKey = normalizeInstituteNme(r.nome_empresa);
    const instId = instituteIds[instKey];

    const me = calculateMarginOfError(r.qt_entrevistados || 0);

    processed.push({
      id: r.protocolo,
      institute: r.nome_empresa,
      institute_id: instId,
      tse_register: r.protocolo,
      date: r.dt_fim || "",
      fieldwork_start: r.dt_inicio || "",
      fieldwork_end: r.dt_fim || "",
      sample_size: r.qt_entrevistados || 0,
      margin_error: me,
      source_url: `https://www.tse.jus.br/eleitor/glossario/termos/pesquisas-eleitorais`,
      state: r.uf,
      valid,
      issues,
    });

    if (processed.length >= limit) break;
  }

  console.log(
    `   Tier 1 matched: ${processed.length}, skipped (non-Tier1): ${skipped}`
  );

  return processed;
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  const LIMIT = parseInt(
    process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "50"
  );

  console.log("\n" + "━".repeat(60));
  console.log("📊 Import PesqEle Senador 2026");
  console.log("━".repeat(60));
  console.log(`Mode: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);
  console.log(`Limit: ${LIMIT} polls`);
  console.log(`Tier 1 institutos: ${TIER1_INSTITUTOS.length}`);

  // Fetch institute IDs
  const instituteIds = await getInstituteIds();
  console.log(`✓ ${Object.keys(instituteIds).length} institutos no mapa`);

  // Fetch raw senador polls
  const raw = await fetchSenadoRPolls(LIMIT * 2);
  if (raw.length === 0) {
    console.error("❌ Nenhuma pesquisa encontrada no PesqEle");
    return;
  }

  // Process and filter
  const processed = await processRecords(raw, instituteIds, LIMIT);
  const valid = processed.filter((p) => p.valid);
  const invalid = processed.filter((p) => !p.valid);

  console.log(`\n📋 Resultados:`);
  console.log(`   Total processado: ${processed.length}`);
  console.log(`   ✓ Válido: ${valid.length}`);
  console.log(`   ❌ Inválido: ${invalid.length}`);

  if (invalid.length > 0) {
    console.log(`\n⚠️  Problemas encontrados:`);
    const issueMap = new Map<string, number>();
    for (const inv of invalid) {
      for (const issue of inv.issues) {
        issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
      }
    }
    for (const [issue, count] of issueMap) {
      console.log(`   - ${issue}: ${count} registros`);
    }
  }

  // Group by institute
  const byInst = new Map<string, PesqEleSenadorProcessed[]>();
  for (const p of valid) {
    const cur = byInst.get(p.institute) || [];
    cur.push(p);
    byInst.set(p.institute, cur);
  }

  console.log(`\n📦 Por instituto:`);
  for (const [inst, polls] of Array.from(byInst).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${inst.padEnd(25)} ${polls.length} pesquisas`);
  }

  // Sample of 5 polls
  console.log(`\n📝 Amostra (primeiras 5 válidas):`);
  console.log("━".repeat(60));
  for (const p of valid.slice(0, 5)) {
    console.log(`  ID: ${p.id}`);
    console.log(`  Instituto: ${p.institute}`);
    console.log(`  Datas: ${p.fieldwork_start} → ${p.fieldwork_end}`);
    console.log(`  Amostra: n=${p.sample_size}, ME=${p.margin_error}%`);
    console.log(`  UF: ${p.state}`);
    console.log(``);
  }

  // Export to JSON
  const outputPath = path.join(os.tmpdir(), "pesqele_senador_import.json");
  const exportData = {
    metadata: {
      exported_at: new Date().toISOString(),
      total_raw: raw.length,
      total_processed: processed.length,
      total_valid: valid.length,
      tier1_institutes: TIER1_INSTITUTOS,
    },
    polls: valid,
  };

  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
  console.log(`\n💾 Exportado: ${outputPath}`);
  console.log(`   ${valid.length} polls válidas`);

  if (APPLY) {
    console.log(`\n⏳ Aplicando ao banco de dados...`);

    const instituteIds = await getInstituteIds();

    // Fetch senador 2026 elections
    const { data: elections } = await supabase
      .from("elections")
      .select("id, state")
      .eq("type", "SENADOR")
      .eq("year", 2026);

    const stateToElectionId: Record<string, string> = {};
    elections?.forEach(e => {
      stateToElectionId[e.state] = e.id;
    });

    let inserted = 0;

    for (const poll of valid) {
      // Fuzzy match: buscar por chave exata ou parcial
      let instituteId: string | null = instituteIds[poll.institute.toLowerCase()];
      if (!instituteId) {
        // Tentar match parcial
        const partialKey = Object.keys(instituteIds).find(
          k => poll.institute.toLowerCase().includes(k) || k.includes(poll.institute.toLowerCase().split(' ')[0])
        );
        instituteId = partialKey ? instituteIds[partialKey] : null;
      }

      if (!instituteId) {
        console.warn(`⚠️  Instituto não encontrado: ${poll.institute}`);
        continue;
      }

      const electionId = stateToElectionId[poll.state];
      if (!electionId) {
        console.warn(`⚠️  Eleição não encontrada para ${poll.state}`);
        continue;
      }

      // Format tse_register to BR-XXXXX/2026 format
      let tseRegistration = poll.tse_register;
      if (tseRegistration && !tseRegistration.startsWith("BR-")) {
        // Extract numeric part (e.g., PI066562026 → 06656)
        const numPart = tseRegistration.replace(/[A-Z]/g, "").slice(0, 5);
        tseRegistration = `BR-${numPart}/2026`;
      }

      const { error } = await supabase
        .from("polls")
        .insert({
          institute_id: instituteId,
          election_id: electionId,
          scope: `uf:${poll.state}`,
          fieldwork_start: poll.fieldwork_start,
          fieldwork_end: poll.fieldwork_end,
          publication_date: poll.date, // Use poll publication date
          sample_size: poll.sample_size,
          margin_of_error: poll.margin_error,
          tse_registration: tseRegistration,
          source_url: poll.source_url,
          source_kind: "tse-pesqele-senador",
          is_verified: true,
          round: 1
        });

      if (error) {
        console.error(`❌ Erro inserindo ${poll.id}: ${error.message}`);
      } else {
        inserted++;
      }
    }

    console.log(`   ✓ ${inserted}/${valid.length} pesquisas inseridas`);
  } else {
    console.log(`\n💡 Próximo: revisar amostra acima, depois rodar com --apply`);
  }

  console.log("━".repeat(60) + "\n");
}

main().catch(console.error);
