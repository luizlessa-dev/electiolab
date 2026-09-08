#!/usr/bin/env npx tsx
/**
 * Ingestão a partir do registro TSE: pega metadados (amostra, datas, metodologia)
 * e busca os resultados em matérias de imprensa.
 *
 * Uso:
 *   npx tsx scripts/ingest-from-tse-registry.ts --protocols BR067902026,BR014622026
 *   npx tsx scripts/ingest-from-tse-registry.ts --recent 10  (últimas 10 prontas)
 */

import * as fs from "fs";
import * as path from "path";

// ── Manual registry com metadados TSE já coletados ─────────────────────────
// (Substituir por scrape do agenciasertao.com se necessário)

const TSE_REGISTRY = [
  {
    protocol: "BR067902026",
    institute: "NEXUS",
    cargo: "Presidente",
    fieldwork_start: "2026-09-04",
    fieldwork_end: "2026-09-07",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "telefônica",
    disclosure_date: "2026-09-08",
  },
  {
    protocol: "BR002512026",
    institute: "GRUPO GERP",
    cargo: "Presidente",
    fieldwork_start: "2026-09-02",
    fieldwork_end: "2026-09-03",
    sample_size: 0, // a confirmar
    margin_of_error: 0,
    methodology: "a confirmar",
    disclosure_date: "2026-09-08",
  },
  {
    protocol: "BR014622026",
    institute: "VERITA",
    cargo: "Presidente",
    fieldwork_start: "2026-09-03",
    fieldwork_end: "2026-09-04",
    sample_size: 0, // a confirmar
    margin_of_error: 0,
    methodology: "a confirmar",
    disclosure_date: "2026-09-09",
  },
];

// ── Estrutura de saída ──────────────────────────────────────────────────────

interface PollObject {
  institute_name: string;
  election_name: string;
  publication_date: string;
  fieldwork_start: string;
  fieldwork_end: string;
  sample_size: number;
  margin_of_error: number;
  methodology: string;
  source_url: string;
  tse_protocolo: string;
  scenario_label?: string;
  results: Array<{ candidate_name: string; percentage: number }>;
}

// ── Template de busca Google (pro usuário clicar e buscar) ──────────────────

function generateGoogleSearchLink(
  institute: string,
  fieldwork_end: string,
  cargo: string
): string {
  const month = fieldwork_end.split("-")[1];
  const year = fieldwork_end.split("-")[0];
  const query = encodeURIComponent(
    `${institute} pesquisa ${cargo.toLowerCase()} ${year}-${month} resultado`
  );
  return `https://www.google.com/search?q=${query}`;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("INGESTÃO A PARTIR DO REGISTRO TSE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log();
  console.log("Protocolos com metadados TSE prontos pra buscar matérias:");
  console.log();

  for (const entry of TSE_REGISTRY) {
    console.log(
      `${entry.protocol} · ${entry.institute} · ${entry.cargo} · n=${entry.sample_size}`
    );
    console.log(`  Campo: ${entry.fieldwork_start} a ${entry.fieldwork_end}`);
    console.log(`  Metodologia: ${entry.methodology}`);
    console.log(`  Divulgação: ${entry.disclosure_date}`);
    console.log(`  Buscar matéria: ${generateGoogleSearchLink(entry.institute, entry.fieldwork_end, entry.cargo)}`);
    console.log();
  }

  console.log();
  console.log("📋 Próximo passo:");
  console.log("1. Clique em cada link de busca acima");
  console.log("2. Encontre a matéria de imprensa com os percentuais");
  console.log("3. Copie source_url, publication_date e percentuais");
  console.log("4. Cole aqui pra estruturar em TypeScript pra ingestão");
  console.log();
}

main().catch(console.error);
