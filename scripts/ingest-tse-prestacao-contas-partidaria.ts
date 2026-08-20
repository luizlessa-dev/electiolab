#!/usr/bin/env npx tsx
/**
 * Ingest TSE prestação de contas PARTIDÁRIA — popula party_revenue e
 * party_expense a partir de prestacao_contas_anual_partidaria_<ano>.zip.
 *
 * Distinto de ingest-tse-prestacao-contas.ts (candidate_revenue/
 * candidate_expense_*, nível candidato) — aqui a entidade é o PARTIDO
 * (identificado por CNPJ do prestador de contas + sigla), sem
 * SQ_CANDIDATO/CPF de candidato nenhum. Achado em 2026-08-19: TSE já
 * publica esse dataset (38.943 receitas + 39.076 despesas em 2026),
 * ElectioLab não tinha ingestor pra ele.
 *
 * receita_anual não tem um id de linha único (SQ_*) como despesa_anual
 * tem (SQ_DESPESA) — natural_key é um hash sha256 de um conjunto de
 * campos que juntos identificam a doação de forma estável entre
 * reingestões (cnpj do partido, recibo, documento, data, valor, doador).
 *
 * Cada família usa só o `_BRASIL.csv` (consolidado nacional) — mesmo
 * padrão de ingest-tse-prestacao-contas.ts / ingest-tse-candidaturas.ts.
 *
 * Uso:
 *   npx tsx scripts/ingest-tse-prestacao-contas-partidaria.ts --year=2026
 *   npx tsx scripts/ingest-tse-prestacao-contas-partidaria.ts --year=2026 --apply
 *   npx tsx scripts/ingest-tse-prestacao-contas-partidaria.ts --year=2026 --apply --only=receitas
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import iconv from "iconv-lite";
import { parse } from "csv-parse/sync";
import {
  NULO,
  parseValor,
  parseDateBR,
  downloadCachedStream,
  listZipMembers,
  resolveColumns,
  withRetry,
  type FieldSpec,
} from "./lib/tse-csv";

// ─────────────────────────────────────────────────────────────────
// receita_anual_<ano>_BRASIL.csv tem pelo menos 1 linha com aspas soltas
// dentro de um campo (ex: doador "PIETRO D"AGOSTIN ACUÑA" — TSE não
// escapou a aspa interna), o que quebra até o `relax_quotes` do csv-parse
// usado em streamZipCsvRows (tse-csv.ts) com
// CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE. Em vez de tocar no parser
// compartilhado (usado por outros ingestores que já funcionam bem), lê o
// membro do zip inteiro (~15-20MB, cabe em memória — bem menor que os
// ~300MB+ que justificam streaming em outros datasets), remove aspas que
// não estão em posição de borda de campo (logo após `;`/início de linha
// ou logo antes de `;`/fim de linha) e só então parseia. Fallback pro
// parser normal se não achar nenhuma linha problemática (custo zero).
// ─────────────────────────────────────────────────────────────────
function sanitizeStrayQuotes(csvText: string): string {
  return csvText
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return line;
      let out = "";
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch !== '"') {
          out += ch;
          continue;
        }
        const prevOk = i === 0 || line[i - 1] === ";";
        const nextOk = i === line.length - 1 || line[i + 1] === ";";
        if (prevOk || nextOk) out += ch; // aspa de borda de campo — mantém
        // aspa interna solta — descarta
      }
      return out;
    })
    .join("\n");
}

function* readCsvMemberSanitized(zipPath: string, member: string): Generator<Record<string, string>> {
  const raw = execFileSync("unzip", ["-p", zipPath, member], { maxBuffer: 1024 * 1024 * 200 });
  const text = sanitizeStrayQuotes(iconv.decode(raw, "latin1"));
  const records = parse(text, {
    delimiter: ";",
    columns: true,
    bom: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
  for (const r of records) yield r;
}

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Faltam env vars Supabase em .env.local");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes("--apply");
const YEAR = parseInt(process.argv.find((a) => a.startsWith("--year="))?.split("=")[1] ?? "2026");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const BATCH_SIZE = 500;

const TSE_ZIP_URL = (ano: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas_anual_partidaria/prestacao_contas_anual_partidaria_${ano}.zip`;

function naturalKey(parts: Array<string | null>): string {
  return createHash("sha256").update(parts.map((p) => p ?? "").join("|")).digest("hex");
}

type Stats = { totalRows: number; wouldInsert: number; inserted: number; skippedNoKey: number };
function newStats(): Stats {
  return { totalRows: 0, wouldInsert: 0, inserted: 0, skippedNoKey: 0 };
}
function printStats(label: string, s: Stats) {
  console.log(
    `   📊 ${label}: ${s.totalRows.toLocaleString("pt-BR")} linhas | ${s.wouldInsert.toLocaleString("pt-BR")} ${APPLY ? "inseridas" : "seriam inseridas"} | ${s.skippedNoKey.toLocaleString("pt-BR")} sem chave natural`,
  );
}

async function flushBatch(table: string, rows: Record<string, unknown>[], onConflict: string, stats: Stats) {
  if (rows.length === 0) return;
  const keyCols = onConflict.split(",");
  const deduped = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const key = keyCols.map((k) => String(row[k] ?? "")).join(" ");
    deduped.set(key, row);
  }
  const finalRows = Array.from(deduped.values());
  stats.wouldInsert += finalRows.length;
  if (APPLY) {
    await withRetry(async () => {
      const { error } = await sb.from(table).upsert(finalRows, { onConflict, ignoreDuplicates: false });
      if (error) throw new Error(error.message);
    }, `upsert ${table}`);
    stats.inserted += finalRows.length;
  }
  rows.length = 0;
}

// ─────────────────────────────────────────────────────────────────
// RECEITAS → party_revenue
// ─────────────────────────────────────────────────────────────────
const RECEITA_SPECS: FieldSpec[] = [
  { field: "esferaCode", candidates: ["CD_TP_ESFERA_PARTIDARIA"], tokens: ["ESFERA", "PARTIDARIA"] },
  { field: "esfera", candidates: ["DS_TP_ESPERA_PARTIDARIA", "DS_TP_ESFERA_PARTIDARIA"], tokens: ["ESFERA"] },
  { field: "uf", candidates: ["SG_UF"] },
  { field: "municipioCode", candidates: ["CD_MUNICIPIO"] },
  { field: "municipio", candidates: ["NM_MUNICIPIO"] },
  { field: "zona", candidates: ["NR_ZONA"] },
  { field: "cnpj", candidates: ["NR_CNPJ_PRESTADOR_CONTA"] },
  { field: "partido", candidates: ["SG_PARTIDO"] },
  { field: "partidoNome", candidates: ["NM_PARTIDO"] },
  { field: "origemCode", candidates: ["CD_TP_ORIGEM_DOACAO"], tokens: ["ORIGEM", "DOACAO"] },
  { field: "origem", candidates: ["DS_TP_ORIGEM_DOACAO"], tokens: ["ORIGEM", "DOACAO"] },
  { field: "donorCpfCnpj", candidates: ["NR_CPF_CNPJ_DOADOR"], tokens: ["CPF_CNPJ", "DOADOR"] },
  { field: "donorName", candidates: ["NM_DOADOR"] },
  { field: "donorEsferaCode", candidates: ["CD_TP_ESFERA_PARTIDARIA_DOADOR"], tokens: ["ESFERA", "DOADOR"] },
  { field: "donorEsfera", candidates: ["DS_TP_ESFERA_PARTIDARIA_DOADOR"], tokens: ["ESFERA", "DOADOR"] },
  { field: "donorUf", candidates: ["SG_UF_DOADOR"], tokens: ["UF", "DOADOR"] },
  { field: "donorMunicipioCode", candidates: ["CD_MUNICIPIO_DOADOR"], tokens: ["MUNICIPIO", "DOADOR"] },
  { field: "donorMunicipio", candidates: ["NM_MUNICIPIO_DOADOR"], tokens: ["MUNICIPIO", "DOADOR"] },
  { field: "donorZona", candidates: ["NR_ZONA_DOADOR"], tokens: ["ZONA", "DOADOR"] },
  { field: "donorCandSq", candidates: ["SQ_CANDIDATO_DOADOR"], tokens: ["CANDIDATO", "DOADOR"] },
  { field: "donorCandNum", candidates: ["NR_CANDIDATO_DOADOR"], tokens: ["CANDIDATO", "DOADOR"] },
  { field: "donorCandCargoCode", candidates: ["CD_CANDIDATO_CARGO_DOADOR"], tokens: ["CARGO", "DOADOR"] },
  { field: "donorCandCargo", candidates: ["DS_CANDIDATO_CARGO_DOADOR"], tokens: ["CARGO", "DOADOR"] },
  { field: "fonteCode", candidates: ["CD_TP_FONTE_RECURSO"], tokens: ["FONTE", "RECURSO"] },
  { field: "fonte", candidates: ["DS_TP_FONTE_RECURSO"], tokens: ["FONTE", "RECURSO"] },
  { field: "naturezaCode", candidates: ["CD_TP_NATUREZA_RECURSO"], tokens: ["NATUREZA", "RECURSO"] },
  { field: "natureza", candidates: ["DS_TP_NATUREZA_RECURSO"], tokens: ["NATUREZA", "RECURSO"] },
  { field: "especieCode", candidates: ["CD_TP_ESPECIE_RECURSO"], tokens: ["ESPECIE", "RECURSO"] },
  { field: "especie", candidates: ["DS_TP_ESPECIE_RECURSO"], tokens: ["ESPECIE", "RECURSO"] },
  { field: "recibo", candidates: ["NR_RECIBO_DOACAO"], tokens: ["RECIBO"] },
  { field: "documento", candidates: ["NR_DOCUMENTO"] },
  { field: "dataReceita", candidates: ["DT_RECEITA"] },
  { field: "descricao", candidates: ["DS_RECEITA"] },
  { field: "valor", candidates: ["VR_RECEITA"] },
];

async function processReceitas(allMembers: string[], zipPath: string): Promise<Stats> {
  const stats = newStats();
  const member = allMembers.find((m) => new RegExp(`^receita_anual_${YEAR}_BRASIL\\.csv$`, "i").test(m));
  console.log(`\n━━━ party_revenue (receita_anual) — ${member ?? "arquivo não encontrado"} ━━━`);
  if (!member) return stats;
  let batch: Record<string, unknown>[] = [];
  let cols: Record<string, string | null> | null = null;

  for (const row of readCsvMemberSanitized(zipPath, member)) {
    if (!cols) {
      const header = Object.keys(row);
      const { map, missing } = resolveColumns(header, RECEITA_SPECS);
      cols = map;
      console.log(`   header: ${header.join(", ")}`);
      if (missing.length) console.warn(`   ⚠️  campos não resolvidos: ${missing.join(", ")}`);
    }
    const c = cols;
    stats.totalRows++;

    const cnpj = c.cnpj ? NULO(row[c.cnpj]) : null;
    const recibo = c.recibo ? NULO(row[c.recibo]) : null;
    const documento = c.documento ? NULO(row[c.documento]) : null;
    const dataReceita = c.dataReceita ? NULO(row[c.dataReceita]) : null;
    const valorRaw = c.valor ? NULO(row[c.valor]) : null;
    const donorCpfCnpj = c.donorCpfCnpj ? NULO(row[c.donorCpfCnpj]) : null;

    if (!cnpj || !valorRaw) {
      stats.skippedNoKey++;
      continue;
    }

    const natural_key = naturalKey([cnpj, recibo, documento, dataReceita, valorRaw, donorCpfCnpj]);

    batch.push({
      natural_key,
      election_year: YEAR,
      esfera_partidaria_code: c.esferaCode ? parseInt(NULO(row[c.esferaCode]) ?? "") || null : null,
      esfera_partidaria: c.esfera ? NULO(row[c.esfera]) : null,
      uf: c.uf ? NULO(row[c.uf]) : null,
      municipio_code: c.municipioCode ? NULO(row[c.municipioCode]) : null,
      municipio: c.municipio ? NULO(row[c.municipio]) : null,
      zona: c.zona ? NULO(row[c.zona]) : null,
      cnpj_prestador_conta: cnpj,
      party_acronym: c.partido ? NULO(row[c.partido]) : null,
      party_name: c.partidoNome ? NULO(row[c.partidoNome]) : null,
      origem_doacao_code: c.origemCode ? parseInt(NULO(row[c.origemCode]) ?? "") || null : null,
      origem_doacao: c.origem ? NULO(row[c.origem]) : null,
      donor_cpf_cnpj: donorCpfCnpj,
      donor_name: c.donorName ? NULO(row[c.donorName]) : null,
      donor_esfera_partidaria_code: c.donorEsferaCode ? parseInt(NULO(row[c.donorEsferaCode]) ?? "") || null : null,
      donor_esfera_partidaria: c.donorEsfera ? NULO(row[c.donorEsfera]) : null,
      donor_uf: c.donorUf ? NULO(row[c.donorUf]) : null,
      donor_municipio_code: c.donorMunicipioCode ? NULO(row[c.donorMunicipioCode]) : null,
      donor_municipio: c.donorMunicipio ? NULO(row[c.donorMunicipio]) : null,
      donor_zona: c.donorZona ? NULO(row[c.donorZona]) : null,
      donor_candidate_sq: c.donorCandSq ? NULO(row[c.donorCandSq]) : null,
      donor_candidate_number: c.donorCandNum ? NULO(row[c.donorCandNum]) : null,
      donor_candidate_cargo_code: c.donorCandCargoCode ? parseInt(NULO(row[c.donorCandCargoCode]) ?? "") || null : null,
      donor_candidate_cargo: c.donorCandCargo ? NULO(row[c.donorCandCargo]) : null,
      fonte_recurso_code: c.fonteCode ? parseInt(NULO(row[c.fonteCode]) ?? "") || null : null,
      fonte_recurso: c.fonte ? NULO(row[c.fonte]) : null,
      natureza_recurso_code: c.naturezaCode ? parseInt(NULO(row[c.naturezaCode]) ?? "") || null : null,
      natureza_recurso: c.natureza ? NULO(row[c.natureza]) : null,
      especie_recurso_code: c.especieCode ? parseInt(NULO(row[c.especieCode]) ?? "") || null : null,
      especie_recurso: c.especie ? NULO(row[c.especie]) : null,
      receipt_number: recibo,
      document_number: documento,
      receita_date: parseDateBR(dataReceita),
      description: c.descricao ? NULO(row[c.descricao]) : null,
      value_brl: parseValor(valorRaw),
      source_url: TSE_ZIP_URL(YEAR),
      raw: row,
    });

    if (batch.length >= BATCH_SIZE) await flushBatch("party_revenue", batch, "natural_key", stats);
  }
  await flushBatch("party_revenue", batch, "natural_key", stats);
  return stats;
}

// ─────────────────────────────────────────────────────────────────
// DESPESAS → party_expense (SQ_DESPESA existe — chave natural limpa)
// ─────────────────────────────────────────────────────────────────
const DESPESA_SPECS: FieldSpec[] = [
  { field: "exercicio", candidates: ["AA_EXERCICIO"] },
  { field: "tipoDespesa", candidates: ["TP_DESPESA"], tokens: ["TIPO", "DESPESA"] },
  { field: "esferaCode", candidates: ["CD_TP_ESFERA_PARTIDARIA"], tokens: ["ESFERA", "PARTIDARIA"] },
  { field: "esfera", candidates: ["DS_TP_ESFERA_PARTIDARIA"], tokens: ["ESFERA", "PARTIDARIA"] },
  { field: "uf", candidates: ["SG_UF"] },
  { field: "municipioCode", candidates: ["CD_MUNICIPIO"] },
  { field: "municipio", candidates: ["NM_MUNICIPIO"] },
  { field: "zona", candidates: ["NR_ZONA"] },
  { field: "cnpj", candidates: ["NR_CNPJ_PRESTADOR_CONTA"] },
  { field: "partido", candidates: ["SG_PARTIDO"] },
  { field: "partidoNome", candidates: ["NM_PARTIDO"] },
  { field: "docTipoCode", candidates: ["CD_TP_DOCUMENTO"], tokens: ["TIPO", "DOCUMENTO"] },
  { field: "docTipo", candidates: ["DS_TP_DOCUMENTO"], tokens: ["TIPO", "DOCUMENTO"] },
  { field: "docNumero", candidates: ["NR_DOCUMENTO"] },
  { field: "aidfAno", candidates: ["AA_AIDF"] },
  { field: "aidfNumero", candidates: ["NR_AIDF"] },
  { field: "fornecedorTipoCode", candidates: ["CD_TP_FORNECEDOR"], tokens: ["TIPO", "FORNECEDOR"] },
  { field: "fornecedorTipo", candidates: ["DS_TP_FORNECEDOR"], tokens: ["TIPO", "FORNECEDOR"] },
  { field: "fornecedorCpfCnpj", candidates: ["NR_CPF_CNPJ_FORNECEDOR"], tokens: ["CPF_CNPJ", "FORNECEDOR"] },
  { field: "fornecedorNome", candidates: ["NM_FORNECEDOR"] },
  { field: "descricao", candidates: ["DS_GASTO"] },
  { field: "dataPagamento", candidates: ["DT_PAGAMENTO"] },
  { field: "valorGasto", candidates: ["VR_GASTO"] },
  { field: "valorPago", candidates: ["VR_PAGAMENTO"] },
  { field: "valorDocumento", candidates: ["VR_DOCUMENTO"] },
  { field: "fonteCode", candidates: ["CD_FONTE_DESPESA"], tokens: ["FONTE", "DESPESA"] },
  { field: "fonte", candidates: ["DS_FONTE_DESPESA"], tokens: ["FONTE", "DESPESA"] },
  { field: "sqDespesa", candidates: ["SQ_DESPESA"] },
];

async function processDespesas(allMembers: string[], zipPath: string): Promise<Stats> {
  const stats = newStats();
  const member = allMembers.find((m) => new RegExp(`^despesa_anual_${YEAR}_BRASIL\\.csv$`, "i").test(m));
  console.log(`\n━━━ party_expense (despesa_anual) — ${member ?? "arquivo não encontrado"} ━━━`);
  if (!member) return stats;
  let batch: Record<string, unknown>[] = [];
  let cols: Record<string, string | null> | null = null;

  for (const row of readCsvMemberSanitized(zipPath, member)) {
    if (!cols) {
      const header = Object.keys(row);
      const { map, missing } = resolveColumns(header, DESPESA_SPECS);
      cols = map;
      console.log(`   header: ${header.join(", ")}`);
      if (missing.length) console.warn(`   ⚠️  campos não resolvidos: ${missing.join(", ")}`);
    }
    const c = cols;
    stats.totalRows++;

    const sqDespesa = c.sqDespesa ? NULO(row[c.sqDespesa]) : null;
    if (!sqDespesa) {
      stats.skippedNoKey++;
      continue;
    }

    batch.push({
      sq_despesa: sqDespesa,
      election_year: YEAR,
      exercicio: c.exercicio ? parseInt(NULO(row[c.exercicio]) ?? "") || null : null,
      expense_type: c.tipoDespesa ? NULO(row[c.tipoDespesa]) : null,
      esfera_partidaria_code: c.esferaCode ? parseInt(NULO(row[c.esferaCode]) ?? "") || null : null,
      esfera_partidaria: c.esfera ? NULO(row[c.esfera]) : null,
      uf: c.uf ? NULO(row[c.uf]) : null,
      municipio_code: c.municipioCode ? NULO(row[c.municipioCode]) : null,
      municipio: c.municipio ? NULO(row[c.municipio]) : null,
      zona: c.zona ? NULO(row[c.zona]) : null,
      cnpj_prestador_conta: c.cnpj ? NULO(row[c.cnpj]) : null,
      party_acronym: c.partido ? NULO(row[c.partido]) : null,
      party_name: c.partidoNome ? NULO(row[c.partidoNome]) : null,
      document_type_code: c.docTipoCode ? parseInt(NULO(row[c.docTipoCode]) ?? "") || null : null,
      document_type: c.docTipo ? NULO(row[c.docTipo]) : null,
      document_number: c.docNumero ? NULO(row[c.docNumero]) : null,
      aidf_year: c.aidfAno ? parseInt(NULO(row[c.aidfAno]) ?? "") || null : null,
      aidf_number: c.aidfNumero ? NULO(row[c.aidfNumero]) : null,
      supplier_type_code: c.fornecedorTipoCode ? parseInt(NULO(row[c.fornecedorTipoCode]) ?? "") || null : null,
      supplier_type: c.fornecedorTipo ? NULO(row[c.fornecedorTipo]) : null,
      supplier_cpf_cnpj: c.fornecedorCpfCnpj ? NULO(row[c.fornecedorCpfCnpj]) : null,
      supplier_name: c.fornecedorNome ? NULO(row[c.fornecedorNome]) : null,
      description: c.descricao ? NULO(row[c.descricao]) : null,
      payment_date: c.dataPagamento ? parseDateBR(NULO(row[c.dataPagamento])) : null,
      value_expense: c.valorGasto ? parseValor(row[c.valorGasto]) : null,
      value_paid: c.valorPago ? parseValor(row[c.valorPago]) : null,
      value_document: c.valorDocumento ? parseValor(row[c.valorDocumento]) : null,
      fonte_despesa_code: c.fonteCode ? parseInt(NULO(row[c.fonteCode]) ?? "") || null : null,
      fonte_despesa: c.fonte ? NULO(row[c.fonte]) : null,
      source_url: TSE_ZIP_URL(YEAR),
      raw: row,
    });

    if (batch.length >= BATCH_SIZE)
      await flushBatch("party_expense", batch, "sq_despesa,election_year", stats);
  }
  await flushBatch("party_expense", batch, "sq_despesa,election_year", stats);
  return stats;
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🏛️  TSE Prestação de Contas Partidária — Ingest`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"} | Ano: ${YEAR}${ONLY ? ` | only: ${ONLY}` : ""}`);

  const zipPath = await downloadCachedStream(
    TSE_ZIP_URL(YEAR),
    `prestacao_contas_anual_partidaria_${YEAR}.zip`,
  );
  const allMembers = listZipMembers(zipPath);
  console.log(`📦 ${allMembers.length} arquivos no ZIP`);

  if (!ONLY || ONLY === "receitas") {
    const r = await processReceitas(allMembers, zipPath);
    printStats("party_revenue", r);
  }
  if (!ONLY || ONLY === "despesas") {
    const d = await processDespesas(allMembers, zipPath);
    printStats("party_expense", d);
  }

  console.log("\n✅ Concluído");
  if (!APPLY) console.log("   (rodou em dry-run; use --apply pra gravar)");
})();
