#!/usr/bin/env npx tsx
/**
 * Fila de curadoria de pesquisas — worklist do operador.
 *
 * Lê a view `pesqele_missing` (pesquisas registradas no TSE que ainda NÃO têm
 * resultados no banco) e produz uma lista PRIORIZADA do que vale curar
 * manualmente via scripts/ingest-manual.ts.
 *
 * Por que manual e não automático:
 *   O TSE registra apenas metadados (instituto, amostra, metodologia) — NUNCA
 *   os percentuais. Os resultados saem em fonte primária (release do instituto)
 *   e são curados com source_url para manter a proveniência auditável.
 *
 * Uso:
 *   npx tsx scripts/pending-polls.ts                 # imprime worklist no terminal
 *   npx tsx scripts/pending-polls.ts --md            # + grava worklist em Markdown no Desktop
 *   npx tsx scripts/pending-polls.ts --days 45       # janela de recência (default 30)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { normalizeInstituteName } from "../src/lib/candidate-fuzzy-match";

// ── Env ──────────────────────────────────────────────────────────────────────
const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Args ───────────────────────────────────────────────────────────────────────
const WRITE_MD = process.argv.includes("--md");
const DAYS = (() => {
  const i = process.argv.indexOf("--days");
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : 30;
})();

// ── Config de priorização ──────────────────────────────────────────────────────

/** Tokens de institutos reputados (busca no nome legal/fantasia do TSE) */
const REPUTABLE_TOKENS = [
  "datafolha", "quaest", "atlas", "poderdata", "poder data", "ipespe", "ipec",
  "parana pesquisas", "real time", "mda", "nexus", "futura", "vox brasil",
  "gerp", "meio", "ideia", "fsb", "verita", "seculus", "neokemp", "vetor",
  "indice", "datatempo", "datafolha", "genial",
];

/** Maiores colégios eleitorais — governador prioritário */
const MAJOR_STATES = ["SP", "MG", "RJ", "RS", "BA", "PR", "PE", "CE", "GO", "PA", "SC", "DF"];

/**
 * Institutos com qualidade contestada (pesquisas suspensas pela Justiça Eleitoral
 * por vícios metodológicos em 2026). Sinalizados mas não removidos — decisão do operador.
 */
const SUSPECT_TOKENS = ["verita"];

function isSuspect(instituto: string): boolean {
  const norm = instituto.toLowerCase();
  return SUSPECT_TOKENS.some((t) => norm.includes(t));
}

type MissingRow = {
  protocolo: string;
  uf: string;
  cargos: string;
  instituto: string;
  fieldwork_end: string;
  publication_date: string | null;
  sample_size: number | null;
  days_since_fieldwork: number | null;
};

function isReputable(instituto: string): boolean {
  const norm = instituto.toLowerCase();
  return REPUTABLE_TOKENS.some((t) => norm.includes(t));
}

function isPresidente(cargos: string): boolean {
  return /presidente/i.test(cargos);
}

function isGovernador(cargos: string): boolean {
  return /governador/i.test(cargos);
}

/** URL de busca sugerida para achar os resultados em fonte primária */
function suggestSource(row: MissingRow): string {
  const inst = normalizeInstituteName(row.instituto);
  const cargo = isPresidente(row.cargos) ? "presidente" : isGovernador(row.cargos) ? `governador ${row.uf}` : row.uf;
  const q = encodeURIComponent(`${inst} pesquisa ${cargo} ${row.fieldwork_end?.slice(0, 7)} 2026 resultado`);
  return `https://www.google.com/search?q=${q}`;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const { data, error } = await sb
    .from("pesqele_missing")
    .select("protocolo, uf, cargos, instituto, fieldwork_end, publication_date, sample_size, days_since_fieldwork")
    .order("fieldwork_end", { ascending: false });

  if (error) {
    console.error("❌ erro ao ler pesqele_missing:", error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as MissingRow[];

  // Filtra: recência (campo terminou nos últimos DAYS dias e não no futuro)
  const recent = rows.filter((r) => {
    const d = r.days_since_fieldwork;
    return d !== null && d >= 0 && d <= DAYS;
  });

  // Classifica em tiers
  const tier1: MissingRow[] = []; // Presidente, n>=1500
  const tier2: MissingRow[] = []; // Governador major-state reputável, n>=1000
  const tier3: MissingRow[] = []; // Demais governadores reputáveis recentes

  for (const r of recent) {
    const n = r.sample_size ?? 0;
    if (isPresidente(r.cargos) && n >= 1500 && isReputable(r.instituto)) {
      tier1.push(r);
    } else if (isGovernador(r.cargos) && MAJOR_STATES.includes(r.uf) && n >= 1000 && isReputable(r.instituto)) {
      tier2.push(r);
    } else if (isGovernador(r.cargos) && isReputable(r.instituto) && n >= 800) {
      tier3.push(r);
    }
  }

  const fmtRow = (r: MissingRow) => {
    const inst = normalizeInstituteName(r.instituto);
    const cargo = isPresidente(r.cargos) ? "Presidente" : `Gov. ${r.uf}`;
    const flag = isSuspect(r.instituto) ? " ⚠️ qualidade contestada" : "";
    return `  ${r.fieldwork_end}  n=${String(r.sample_size ?? "?").padStart(5)}  ${inst.slice(0, 28).padEnd(28)}  ${cargo}${flag}`;
  };

  // ── Terminal ──
  console.log(`\n🗳️  Fila de Curadoria — ElectioLab`);
  console.log(`   Fonte: view pesqele_missing (registros TSE sem resultado no banco)`);
  console.log(`   Janela: últimos ${DAYS} dias · ${recent.length} pendências recentes de ${rows.length} totais\n`);

  console.log(`━━━ TIER 1 · PRESIDENCIAL (${tier1.length}) — máxima prioridade ━━━`);
  if (tier1.length === 0) console.log(`  ✅ Nenhuma pendência presidencial recente de instituto reputado.`);
  for (const r of tier1) console.log(fmtRow(r));

  console.log(`\n━━━ TIER 2 · GOVERNADOR (estados-chave) (${tier2.length}) ━━━`);
  if (tier2.length === 0) console.log(`  ✅ Nenhuma pendência de governador em estado-chave.`);
  for (const r of tier2) console.log(fmtRow(r));

  console.log(`\n━━━ TIER 3 · GOVERNADOR (demais estados) (${tier3.length}) ━━━`);
  for (const r of tier3.slice(0, 20)) console.log(fmtRow(r));
  if (tier3.length > 20) console.log(`  … +${tier3.length - 20} outras`);

  console.log(`\n📋 Total priorizado: ${tier1.length + tier2.length + tier3.length} pesquisas`);
  console.log(`   Curar via: edite PENDING_POLLS em scripts/ingest-manual.ts e rode npx tsx scripts/ingest-manual.ts`);

  // ── Markdown (opcional) ──
  if (WRITE_MD) {
    const lines: string[] = [];
    lines.push(`# ElectioLab — Fila de Curadoria de Pesquisas`);
    lines.push(``);
    lines.push(`> Gerado a partir da view \`pesqele_missing\` (registros oficiais do TSE sem resultado curado).`);
    lines.push(`> O TSE registra só metadados — os percentuais vêm de fonte primária com \`source_url\`.`);
    lines.push(``);
    lines.push(`Janela: últimos ${DAYS} dias · ${recent.length} pendências recentes.`);
    lines.push(``);
    lines.push(`⚠️ = instituto com pesquisas suspensas pela Justiça Eleitoral em 2026 (qualidade contestada) — avaliar antes de curar.`);
    lines.push(``);

    const section = (title: string, list: MissingRow[]) => {
      lines.push(`## ${title} (${list.length})`);
      lines.push(``);
      if (list.length === 0) {
        lines.push(`_Nenhuma pendência._`);
        lines.push(``);
        return;
      }
      lines.push(`| Campo (fim) | Instituto | Cargo | n | Protocolo TSE | Buscar resultado |`);
      lines.push(`|---|---|---|---|---|---|`);
      for (const r of list) {
        const inst = normalizeInstituteName(r.instituto) + (isSuspect(r.instituto) ? " ⚠️" : "");
        const cargo = isPresidente(r.cargos) ? "Presidente" : `Gov. ${r.uf}`;
        lines.push(
          `| ${r.fieldwork_end} | ${inst} | ${cargo} | ${r.sample_size ?? "?"} | \`${r.protocolo}\` | [buscar](${suggestSource(r)}) |`
        );
      }
      lines.push(``);
    };

    section("TIER 1 · Presidencial — máxima prioridade", tier1);
    section("TIER 2 · Governador (estados-chave)", tier2);
    section("TIER 3 · Governador (demais estados)", tier3);

    const outPath = path.join(os.homedir(), "Desktop", "ELECTIOLAB-FILA-CURADORIA.md");
    fs.writeFileSync(outPath, lines.join("\n"));
    console.log(`\n📝 Worklist gravada em: ${outPath}`);
  }
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
