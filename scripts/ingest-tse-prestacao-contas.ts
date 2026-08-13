#!/usr/bin/env npx tsx
/**
 * Ingest TSE prestação de contas eleitorais de candidatos — popula
 * candidate_revenue, candidate_revenue_original_donor,
 * candidate_expense_paid, candidate_expense_contracted a partir do ZIP
 * nacional único do TSE (~2GB descomprimido nas 4 famílias somadas).
 *
 * Volume grande demais pro padrão AdmZip-em-memória usado em
 * ingest-tse-extended.ts / ingest-tse-candidaturas.ts. Aqui: streaming
 * linha a linha via `unzip -p | iconv | csv-parse` (scripts/lib/tse-csv.ts),
 * upsert incremental por lote sem acumular o arquivo inteiro em memória.
 *
 * Ordem de processamento importa: despesas_pagas_candidatos não tem
 * SQ_CANDIDATO (só SQ_PRESTADOR_CONTAS), então roda por último, usando o
 * mapa sq_prestador_contas→candidate_id construído durante receitas e
 * despesas_contratadas (que trazem os dois campos).
 *
 * Cada família usa **só o `_BRASIL.csv`**, não os 26 arquivos por UF —
 * verificado empiricamente em 2026-08-13 contra dado real de 2022:
 * `_BRASIL.csv` é um superset nacional exato (mesmas linhas dos arquivos
 * por UF, byte a byte comparável por SQ_RECEITA/SQ_DESPESA) **mais** os
 * candidatos a Presidente, que só existem nele (mesmo padrão de
 * `consulta_cand`, usado em ingest-tse-candidaturas.ts — a suposição inicial
 * de que o agregado seria "redundante, não uma fonte exclusiva" pra este
 * pacote estava errada, corrigida depois de medir contra dado real). Usar
 * só o `_BRASIL.csv` evita duplicar trabalho processando os 26 arquivos por
 * UF pra depois descartar tudo que já veio no agregado.
 *
 * Uso:
 *   npx tsx scripts/ingest-tse-prestacao-contas.ts --year=2026                    # dry-run, todas UFs
 *   npx tsx scripts/ingest-tse-prestacao-contas.ts --year=2022 --uf=AC            # dry-run escopado (teste rápido)
 *   npx tsx scripts/ingest-tse-prestacao-contas.ts --year=2026 --apply            # grava no banco
 *   npx tsx scripts/ingest-tse-prestacao-contas.ts --year=2026 --only=despesas-pagas --apply
 *
 * Dependências novas: csv-parse (streaming). unzip/iconv precisam estar
 * no PATH (padrão em ubuntu-latest e macOS).
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import {
  NULO,
  parseValor,
  cleanCpf,
  parseDateBR,
  downloadCachedStream,
  listZipMembers,
  streamZipCsvRows,
  resolveColumns,
  withRetry,
  type FieldSpec,
} from "./lib/tse-csv";

// ─────────────────────────────────────────────────────────────────
// Env
// ─────────────────────────────────────────────────────────────────
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
const UF_FILTER = process.argv.find((a) => a.startsWith("--uf="))?.split("=")[1]?.toUpperCase();
const BATCH_SIZE = 500;

const TSE_ZIP_URL = (ano: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_${ano}.zip`;

// ─────────────────────────────────────────────────────────────────
// Candidatos por CPF (reusa a mesma fonte que ingest-tse-extended.ts)
// ─────────────────────────────────────────────────────────────────
type CandRef = { id: string; cpf: string };

async function loadCandidates(): Promise<Map<string, CandRef>> {
  const map = new Map<string, CandRef>();
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from("candidates")
      .select("id, cpf")
      .not("cpf", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const c of data) {
      const cpf = cleanCpf(c.cpf as string);
      if (cpf) map.set(cpf, { id: c.id as string, cpf });
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`👥 ${map.size} candidatos com CPF na base`);
  return map;
}

// ─────────────────────────────────────────────────────────────────
// Membro do ZIP por família — sempre o _BRASIL.csv (ver comentário no topo).
// `--uf` filtra linhas depois de parseadas (coluna SG_UF), não arquivos.
// ─────────────────────────────────────────────────────────────────
type FamilyKey = "receitas" | "despesasContratadas" | "doadorOriginario" | "despesasPagas";

const FAMILY_PATTERNS: Record<FamilyKey, RegExp> = {
  receitas: /^receitas_candidatos_(\d{4})_BRASIL\.csv$/i,
  despesasContratadas: /^despesas_contratadas_candidatos_(\d{4})_BRASIL\.csv$/i,
  doadorOriginario: /^receitas_candidatos_doador_originario_(\d{4})_BRASIL\.csv$/i,
  despesasPagas: /^despesas_pagas_candidatos_(\d{4})_BRASIL\.csv$/i,
};

function memberForFamily(allMembers: string[], family: FamilyKey, year: number): string | null {
  const pattern = FAMILY_PATTERNS[family];
  for (const m of allMembers) {
    const match = m.match(pattern);
    if (match && parseInt(match[1]) === year) return m;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// Stats + flush em lote (upsert incremental, nunca acumula o arquivo
// inteiro — dry-run conta tudo sem chamar o Supabase)
// ─────────────────────────────────────────────────────────────────
type Stats = { totalRows: number; wouldInsert: number; inserted: number; skippedNoKey: number; matchedCandidate: number };

function newStats(): Stats {
  return { totalRows: 0, wouldInsert: 0, inserted: 0, skippedNoKey: 0, matchedCandidate: 0 };
}

async function flushBatch(table: string, rows: Record<string, unknown>[], onConflict: string, stats: Stats) {
  if (rows.length === 0) return;
  // TSE às vezes repete a mesma chave natural dentro do mesmo lote (retificação
  // duplicada na fonte) — um único INSERT ... ON CONFLICT DO UPDATE não pode
  // afetar a mesma linha duas vezes (Postgres rejeita com erro), então dedupe
  // por chave antes de upsertar. Mantém a última ocorrência (mesma lógica que
  // uma retificação mais recente deveria sobrescrever a anterior).
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
// 1. RECEITAS → candidate_revenue (+ alimenta sqPrestador→candidate_id)
// ─────────────────────────────────────────────────────────────────
const RECEITAS_SPECS: FieldSpec[] = [
  { field: "sqCandidato", candidates: ["SQ_CANDIDATO"] },
  { field: "sqPrestador", candidates: ["SQ_PRESTADOR_CONTAS"] },
  { field: "cpf", candidates: ["NR_CPF_CANDIDATO"] },
  { field: "uf", candidates: ["SG_UF"] },
  { field: "cargo", candidates: ["DS_CARGO"], tokens: ["CARGO"] },
  { field: "partido", candidates: ["SG_PARTIDO"] },
  { field: "fonteReceita", candidates: ["DS_FONTE_RECEITA"], tokens: ["FONTE", "RECEITA"] },
  { field: "origemReceita", candidates: ["DS_ORIGEM_RECEITA"], tokens: ["ORIGEM", "RECEITA"] },
  { field: "naturezaReceita", candidates: ["DS_NATUREZA_RECEITA"], tokens: ["NATUREZA", "RECEITA"] },
  { field: "especieReceita", candidates: ["DS_ESPECIE_RECEITA"], tokens: ["ESPECIE", "RECEITA"] },
  { field: "donorCpfCnpj", candidates: ["NR_CPF_CNPJ_DOADOR"], tokens: ["CPF_CNPJ", "DOADOR"] },
  { field: "donorName", candidates: ["NM_DOADOR"] },
  { field: "donorNameRfb", candidates: ["NM_DOADOR_RFB"], tokens: ["DOADOR", "RFB"] },
  { field: "donorParty", candidates: ["SG_PARTIDO_DOADOR"], tokens: ["PARTIDO", "DOADOR"] },
  { field: "donorState", candidates: ["SG_UF_DOADOR"], tokens: ["UF", "DOADOR"] },
  { field: "donorCity", candidates: ["NM_MUNICIPIO_DOADOR"], tokens: ["MUNICIPIO", "DOADOR"] },
  { field: "receiptNumber", candidates: ["NR_RECIBO_DOACAO", "NR_RECIBO_ELEITORAL"], tokens: ["RECIBO"] },
  { field: "sqReceita", candidates: ["SQ_RECEITA"] },
  { field: "receitaDate", candidates: ["DT_RECEITA"] },
  { field: "description", candidates: ["DS_RECEITA"] },
  { field: "valor", candidates: ["VR_RECEITA"] },
  { field: "turno", candidates: ["ST_TURNO", "NR_TURNO", "CD_TURNO"] },
];

async function processReceitas(
  allMembers: string[],
  zipPath: string,
  byCpf: Map<string, CandRef>,
  sqPrestadorToCandidate: Map<string, string>,
): Promise<Stats> {
  const stats = newStats();
  const member = memberForFamily(allMembers, "receitas", YEAR);
  console.log(`\n━━━ candidate_revenue (receitas_candidatos) — ${member ?? "arquivo não encontrado"} ━━━`);
  if (!member) return stats;
  let batch: Record<string, unknown>[] = [];
  let cols: Record<string, string | null> | null = null;

  for await (const row of streamZipCsvRows(zipPath, member)) {
    if (!cols) {
      const header = Object.keys(row);
      const { map, missing } = resolveColumns(header, RECEITAS_SPECS);
      cols = map;
      console.log(`   header: ${header.join(", ")}`);
      if (missing.length) console.warn(`   ⚠️  campos não resolvidos: ${missing.join(", ")}`);
    }
    const c = cols;
    const uf = c.uf ? NULO(row[c.uf]) : null;
    if (UF_FILTER && uf !== UF_FILTER) continue;
    stats.totalRows++;
    const sqReceita = c.sqReceita ? NULO(row[c.sqReceita]) : null;
    if (!sqReceita) {
      stats.skippedNoKey++;
      continue;
    }
    const cpf = c.cpf ? cleanCpf(row[c.cpf]) : null;
    const candidateId = cpf ? byCpf.get(cpf)?.id ?? null : null;
    if (candidateId) stats.matchedCandidate++;
    const sqPrestador = c.sqPrestador ? NULO(row[c.sqPrestador]) : null;
    if (sqPrestador && candidateId) sqPrestadorToCandidate.set(sqPrestador, candidateId);

    batch.push({
      candidate_id: candidateId,
      sq_candidato: c.sqCandidato ? NULO(row[c.sqCandidato]) : null,
      sq_prestador_contas: sqPrestador,
      cpf,
      election_year: YEAR,
      turno: c.turno ? parseInt(NULO(row[c.turno]) ?? "") || null : null,
      uf,
      cargo: c.cargo ? NULO(row[c.cargo]) : null,
        party_acronym: c.partido ? NULO(row[c.partido]) : null,
        fonte_receita: c.fonteReceita ? NULO(row[c.fonteReceita]) : null,
        origem_receita: c.origemReceita ? NULO(row[c.origemReceita]) : null,
        natureza_receita: c.naturezaReceita ? NULO(row[c.naturezaReceita]) : null,
        especie_receita: c.especieReceita ? NULO(row[c.especieReceita]) : null,
        donor_cpf_cnpj: c.donorCpfCnpj ? cleanCpf(row[c.donorCpfCnpj]) ?? NULO(row[c.donorCpfCnpj]) : null,
        donor_name: c.donorName ? NULO(row[c.donorName]) : null,
        donor_name_rfb: c.donorNameRfb ? NULO(row[c.donorNameRfb]) : null,
        donor_party: c.donorParty ? NULO(row[c.donorParty]) : null,
        donor_state: c.donorState ? NULO(row[c.donorState]) : null,
        donor_city: c.donorCity ? NULO(row[c.donorCity]) : null,
        receipt_number: c.receiptNumber ? NULO(row[c.receiptNumber]) : null,
      sq_receita: sqReceita,
      receita_date: c.receitaDate ? parseDateBR(row[c.receitaDate]) : null,
      description: c.description ? NULO(row[c.description]) : null,
      value_brl: c.valor ? parseValor(row[c.valor]) : null,
      source_url: TSE_ZIP_URL(YEAR),
      raw: row,
    });

    if (batch.length >= BATCH_SIZE) await flushBatch("candidate_revenue", batch, "sq_receita,election_year", stats);
  }
  await flushBatch("candidate_revenue", batch, "sq_receita,election_year", stats);
  return stats;
}

// ─────────────────────────────────────────────────────────────────
// 2. DESPESAS CONTRATADAS → candidate_expense_contracted (+ alimenta o mapa)
// ─────────────────────────────────────────────────────────────────
const DESPESAS_CONTRATADAS_SPECS: FieldSpec[] = [
  { field: "sqCandidato", candidates: ["SQ_CANDIDATO"] },
  { field: "sqPrestador", candidates: ["SQ_PRESTADOR_CONTAS"] },
  { field: "cpf", candidates: ["NR_CPF_CANDIDATO"] },
  { field: "uf", candidates: ["SG_UF"] },
  { field: "cargo", candidates: ["DS_CARGO"], tokens: ["CARGO"] },
  { field: "partido", candidates: ["SG_PARTIDO"] },
  { field: "supplierType", candidates: ["DS_TIPO_FORNECEDOR"], tokens: ["TIPO", "FORNECEDOR"] },
  { field: "supplierCnae", candidates: ["DS_CNAE_FORNECEDOR", "CD_CNAE_FORNECEDOR"], tokens: ["CNAE"] },
  { field: "supplierCpfCnpj", candidates: ["NR_CPF_CNPJ_FORNECEDOR"], tokens: ["CPF_CNPJ", "FORNECEDOR"] },
  { field: "supplierName", candidates: ["NM_FORNECEDOR"] },
  { field: "supplierNameRfb", candidates: ["NM_FORNECEDOR_RFB"], tokens: ["FORNECEDOR", "RFB"] },
  { field: "supplierState", candidates: ["SG_UF_FORNECEDOR"], tokens: ["UF", "FORNECEDOR"] },
  { field: "supplierCity", candidates: ["NM_MUNICIPIO_FORNECEDOR"], tokens: ["MUNICIPIO", "FORNECEDOR"] },
  { field: "documentType", candidates: ["DS_TIPO_DOCUMENTO"], tokens: ["TIPO", "DOCUMENTO"] },
  { field: "documentNumber", candidates: ["NR_DOCUMENTO"] },
  { field: "origemDespesa", candidates: ["DS_ORIGEM_DESPESA"], tokens: ["ORIGEM", "DESPESA"] },
  { field: "sqDespesa", candidates: ["SQ_DESPESA"] },
  { field: "despesaDate", candidates: ["DT_DESPESA"] },
  { field: "description", candidates: ["DS_DESPESA"] },
  { field: "valor", candidates: ["VR_DESPESA_CONTRATADA", "VR_DESPESA"] },
];

async function processDespesasContratadas(
  allMembers: string[],
  zipPath: string,
  byCpf: Map<string, CandRef>,
  sqPrestadorToCandidate: Map<string, string>,
): Promise<Stats> {
  const stats = newStats();
  const member = memberForFamily(allMembers, "despesasContratadas", YEAR);
  console.log(`\n━━━ candidate_expense_contracted (despesas_contratadas_candidatos) — ${member ?? "arquivo não encontrado"} ━━━`);
  if (!member) return stats;
  let batch: Record<string, unknown>[] = [];
  let cols: Record<string, string | null> | null = null;

  for await (const row of streamZipCsvRows(zipPath, member)) {
    if (!cols) {
      const header = Object.keys(row);
      const { map, missing } = resolveColumns(header, DESPESAS_CONTRATADAS_SPECS);
      cols = map;
      console.log(`   header: ${header.join(", ")}`);
      if (missing.length) console.warn(`   ⚠️  campos não resolvidos: ${missing.join(", ")}`);
    }
    const c = cols;
    const uf = c.uf ? NULO(row[c.uf]) : null;
    if (UF_FILTER && uf !== UF_FILTER) continue;
    stats.totalRows++;
    const sqDespesa = c.sqDespesa ? NULO(row[c.sqDespesa]) : null;
    if (!sqDespesa) {
      stats.skippedNoKey++;
      continue;
    }
    const cpf = c.cpf ? cleanCpf(row[c.cpf]) : null;
    const candidateId = cpf ? byCpf.get(cpf)?.id ?? null : null;
    if (candidateId) stats.matchedCandidate++;
    const sqPrestador = c.sqPrestador ? NULO(row[c.sqPrestador]) : null;
    if (sqPrestador && candidateId) sqPrestadorToCandidate.set(sqPrestador, candidateId);

    batch.push({
      candidate_id: candidateId,
      sq_candidato: c.sqCandidato ? NULO(row[c.sqCandidato]) : null,
      sq_prestador_contas: sqPrestador,
      cpf,
      election_year: YEAR,
      uf,
      cargo: c.cargo ? NULO(row[c.cargo]) : null,
      party_acronym: c.partido ? NULO(row[c.partido]) : null,
      supplier_type: c.supplierType ? NULO(row[c.supplierType]) : null,
      supplier_cnae: c.supplierCnae ? NULO(row[c.supplierCnae]) : null,
      supplier_cpf_cnpj: c.supplierCpfCnpj ? NULO(row[c.supplierCpfCnpj]) : null,
      supplier_name: c.supplierName ? NULO(row[c.supplierName]) : null,
      supplier_name_rfb: c.supplierNameRfb ? NULO(row[c.supplierNameRfb]) : null,
      supplier_state: c.supplierState ? NULO(row[c.supplierState]) : null,
      supplier_city: c.supplierCity ? NULO(row[c.supplierCity]) : null,
      document_type: c.documentType ? NULO(row[c.documentType]) : null,
      document_number: c.documentNumber ? NULO(row[c.documentNumber]) : null,
      origem_despesa: c.origemDespesa ? NULO(row[c.origemDespesa]) : null,
      sq_despesa: sqDespesa,
      despesa_date: c.despesaDate ? parseDateBR(row[c.despesaDate]) : null,
      description: c.description ? NULO(row[c.description]) : null,
      value_brl: c.valor ? parseValor(row[c.valor]) : null,
      raw: row,
    });

    if (batch.length >= BATCH_SIZE)
      await flushBatch("candidate_expense_contracted", batch, "sq_despesa,election_year", stats);
  }
  await flushBatch("candidate_expense_contracted", batch, "sq_despesa,election_year", stats);
  return stats;
}

// ─────────────────────────────────────────────────────────────────
// 3. DOADOR ORIGINÁRIO → candidate_revenue_original_donor
// ─────────────────────────────────────────────────────────────────
const DOADOR_ORIGINARIO_SPECS: FieldSpec[] = [
  { field: "sqReceita", candidates: ["SQ_RECEITA"] },
  { field: "sqPrestador", candidates: ["SQ_PRESTADOR_CONTAS"] },
  { field: "uf", candidates: ["SG_UF"] },
  { field: "donorCpfCnpj", candidates: ["NR_CPF_CNPJ_DOADOR_ORIGINARIO"], tokens: ["DOADOR", "ORIGINARIO"] },
  { field: "donorName", candidates: ["NM_DOADOR_ORIGINARIO"], tokens: ["DOADOR", "ORIGINARIO"] },
  { field: "donorNameRfb", candidates: ["NM_DOADOR_ORIGINARIO_RFB"], tokens: ["DOADOR", "RFB"] },
  { field: "donorType", candidates: ["TP_DOADOR_ORIGINARIO", "DS_TIPO_DOADOR_ORIGINARIO", "CD_TIPO_DOADOR_ORIGINARIO"], tokens: ["TIPO", "DOADOR"] },
  { field: "receitaDate", candidates: ["DT_RECEITA"] },
  { field: "description", candidates: ["DS_RECEITA"] },
  { field: "valor", candidates: ["VR_RECEITA", "VR_DOACAO_ORIGINARIA"] },
];

async function processDoadorOriginario(allMembers: string[], zipPath: string): Promise<Stats> {
  const stats = newStats();
  const member = memberForFamily(allMembers, "doadorOriginario", YEAR);
  console.log(`\n━━━ candidate_revenue_original_donor (receitas_candidatos_doador_originario) — ${member ?? "arquivo não encontrado"} ━━━`);
  if (!member) return stats;
  let batch: Record<string, unknown>[] = [];
  let cols: Record<string, string | null> | null = null;

  for await (const row of streamZipCsvRows(zipPath, member)) {
    if (!cols) {
      const header = Object.keys(row);
      const { map, missing } = resolveColumns(header, DOADOR_ORIGINARIO_SPECS);
      cols = map;
      console.log(`   header: ${header.join(", ")}`);
      if (missing.length) console.warn(`   ⚠️  campos não resolvidos: ${missing.join(", ")}`);
    }
    const c = cols;
    const uf = c.uf ? NULO(row[c.uf]) : null;
    if (UF_FILTER && uf !== UF_FILTER) continue;
    stats.totalRows++;
    const sqReceita = c.sqReceita ? NULO(row[c.sqReceita]) : null;
    const donorCpfCnpj = c.donorCpfCnpj ? cleanCpf(row[c.donorCpfCnpj]) ?? NULO(row[c.donorCpfCnpj]) : null;
    if (!sqReceita || !donorCpfCnpj) {
      stats.skippedNoKey++;
      continue;
    }

    batch.push({
      sq_receita: sqReceita,
      election_year: YEAR,
      sq_prestador_contas: c.sqPrestador ? NULO(row[c.sqPrestador]) : null,
      uf,
      donor_original_cpf_cnpj: donorCpfCnpj,
      donor_original_name: c.donorName ? NULO(row[c.donorName]) : null,
      donor_original_name_rfb: c.donorNameRfb ? NULO(row[c.donorNameRfb]) : null,
      donor_original_type: c.donorType ? NULO(row[c.donorType]) : null,
      receita_date: c.receitaDate ? parseDateBR(row[c.receitaDate]) : null,
      description: c.description ? NULO(row[c.description]) : null,
      value_brl: c.valor ? parseValor(row[c.valor]) : null,
      raw: row,
    });

    if (batch.length >= BATCH_SIZE)
      await flushBatch(
        "candidate_revenue_original_donor",
        batch,
        "sq_receita,donor_original_cpf_cnpj,election_year",
        stats,
      );
  }
  await flushBatch("candidate_revenue_original_donor", batch, "sq_receita,donor_original_cpf_cnpj,election_year", stats);
  return stats;
}

// ─────────────────────────────────────────────────────────────────
// 4. DESPESAS PAGAS → candidate_expense_paid (só tem SQ_PRESTADOR_CONTAS —
//    candidate_id vem do mapa construído em receitas/despesas_contratadas)
// ─────────────────────────────────────────────────────────────────
const DESPESAS_PAGAS_SPECS: FieldSpec[] = [
  { field: "sqPrestador", candidates: ["SQ_PRESTADOR_CONTAS"] },
  { field: "uf", candidates: ["SG_UF"] },
  { field: "documentType", candidates: ["DS_TIPO_DOCUMENTO"], tokens: ["TIPO", "DOCUMENTO"] },
  { field: "documentNumber", candidates: ["NR_DOCUMENTO"] },
  { field: "fonteDespesa", candidates: ["DS_FONTE_DESPESA", "DS_FONTE_RECEITA"], tokens: ["FONTE"] },
  { field: "origemDespesa", candidates: ["DS_ORIGEM_DESPESA"], tokens: ["ORIGEM", "DESPESA"] },
  { field: "naturezaDespesa", candidates: ["DS_NATUREZA_DESPESA"], tokens: ["NATUREZA", "DESPESA"] },
  { field: "especieRecurso", candidates: ["DS_ESPECIE_RECURSO", "DS_ESPECIE_DESPESA"], tokens: ["ESPECIE"] },
  { field: "sqDespesa", candidates: ["SQ_DESPESA"] },
  { field: "sqParcelamento", candidates: ["SQ_PARCELAMENTO_DESPESA"], tokens: ["PARCELAMENTO"] },
  { field: "paymentDate", candidates: ["DT_PAGTO_DESPESA", "DT_PAGAMENTO_DESPESA", "DT_DESPESA"], tokens: ["PAGTO"] },
  { field: "description", candidates: ["DS_DESPESA"] },
  { field: "valor", candidates: ["VR_PAGTO_DESPESA", "VR_PAGAMENTO_DESPESA", "VR_DESPESA"], tokens: ["PAGTO"] },
];

async function processDespesasPagas(
  allMembers: string[],
  zipPath: string,
  sqPrestadorToCandidate: Map<string, string>,
): Promise<Stats> {
  const stats = newStats();
  const member = memberForFamily(allMembers, "despesasPagas", YEAR);
  console.log(`\n━━━ candidate_expense_paid (despesas_pagas_candidatos) — ${member ?? "arquivo não encontrado"} ━━━`);
  console.log(`   (mapa sq_prestador_contas→candidate_id: ${sqPrestadorToCandidate.size} entradas)`);
  if (!member) return stats;
  let batch: Record<string, unknown>[] = [];
  let cols: Record<string, string | null> | null = null;
  let unresolvedPrestador = 0;

  for await (const row of streamZipCsvRows(zipPath, member)) {
    if (!cols) {
      const header = Object.keys(row);
      const { map, missing } = resolveColumns(header, DESPESAS_PAGAS_SPECS);
      cols = map;
      console.log(`   header: ${header.join(", ")}`);
      if (missing.length) console.warn(`   ⚠️  campos não resolvidos: ${missing.join(", ")}`);
    }
    const c = cols;
    const uf = c.uf ? NULO(row[c.uf]) : null;
    if (UF_FILTER && uf !== UF_FILTER) continue;
    stats.totalRows++;
    const sqDespesa = c.sqDespesa ? NULO(row[c.sqDespesa]) : null;
    if (!sqDespesa) {
      stats.skippedNoKey++;
      continue;
    }
    const sqPrestador = c.sqPrestador ? NULO(row[c.sqPrestador]) : null;
    const candidateId = sqPrestador ? sqPrestadorToCandidate.get(sqPrestador) ?? null : null;
    if (candidateId) stats.matchedCandidate++;
    else if (sqPrestador) unresolvedPrestador++;

    batch.push({
      candidate_id: candidateId,
      sq_prestador_contas: sqPrestador,
      election_year: YEAR,
      uf,
      document_type: c.documentType ? NULO(row[c.documentType]) : null,
      document_number: c.documentNumber ? NULO(row[c.documentNumber]) : null,
      fonte_despesa: c.fonteDespesa ? NULO(row[c.fonteDespesa]) : null,
      origem_despesa: c.origemDespesa ? NULO(row[c.origemDespesa]) : null,
      natureza_despesa: c.naturezaDespesa ? NULO(row[c.naturezaDespesa]) : null,
      especie_recurso: c.especieRecurso ? NULO(row[c.especieRecurso]) : null,
      sq_despesa: sqDespesa,
      sq_parcelamento_despesa: c.sqParcelamento ? NULO(row[c.sqParcelamento]) : null,
      payment_date: c.paymentDate ? parseDateBR(row[c.paymentDate]) : null,
      description: c.description ? NULO(row[c.description]) : null,
      value_brl: c.valor ? parseValor(row[c.valor]) : null,
      raw: row,
    });

    if (batch.length >= BATCH_SIZE) await flushBatch("candidate_expense_paid", batch, "sq_despesa,election_year", stats);
  }
  await flushBatch("candidate_expense_paid", batch, "sq_despesa,election_year", stats);
  console.log(`   ⚠️  ${unresolvedPrestador.toLocaleString("pt-BR")} linhas com sq_prestador_contas sem candidate_id resolvido`);
  return stats;
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
function printStats(label: string, s: Stats) {
  console.log(
    `   📊 ${label}: ${s.totalRows.toLocaleString("pt-BR")} linhas | ${s.wouldInsert.toLocaleString("pt-BR")} ${APPLY ? "inseridas" : "seriam inseridas"} | ${s.skippedNoKey.toLocaleString("pt-BR")} sem chave natural | ${s.matchedCandidate.toLocaleString("pt-BR")} com candidate_id`,
  );
}

(async () => {
  console.log(`\n🇧🇷 TSE Prestação de Contas — Ingest`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);
  console.log(`   Ano: ${YEAR}${UF_FILTER ? ` | UF: ${UF_FILTER}` : ""}${ONLY ? ` | only: ${ONLY}` : ""}`);

  const zipPath = await downloadCachedStream(
    TSE_ZIP_URL(YEAR),
    `prestacao_de_contas_eleitorais_candidatos_${YEAR}.zip`,
  );
  const allMembers = listZipMembers(zipPath);
  console.log(`📦 ${allMembers.length} arquivos no ZIP`);

  const byCpf = await loadCandidates();
  const sqPrestadorToCandidate = new Map<string, string>();

  const results: Record<string, Stats> = {};

  if (!ONLY || ONLY === "receitas") {
    results.receitas = await processReceitas(allMembers, zipPath, byCpf, sqPrestadorToCandidate);
    printStats("candidate_revenue", results.receitas);
  }
  if (!ONLY || ONLY === "despesas-contratadas") {
    results.despesasContratadas = await processDespesasContratadas(allMembers, zipPath, byCpf, sqPrestadorToCandidate);
    printStats("candidate_expense_contracted", results.despesasContratadas);
  }
  if (!ONLY || ONLY === "doador-originario") {
    results.doadorOriginario = await processDoadorOriginario(allMembers, zipPath);
    printStats("candidate_revenue_original_donor", results.doadorOriginario);
  }
  if (!ONLY || ONLY === "despesas-pagas") {
    // Requer o mapa sq_prestador_contas→candidate_id — só é completo se
    // receitas e despesas_contratadas rodaram nesta mesma execução.
    if (ONLY === "despesas-pagas") {
      console.warn(
        "⚠️  Rodando só despesas-pagas: o mapa sq_prestador_contas→candidate_id fica vazio (precisa rodar receitas/despesas-contratadas antes, ou sem --only).",
      );
    }
    results.despesasPagas = await processDespesasPagas(allMembers, zipPath, sqPrestadorToCandidate);
    printStats("candidate_expense_paid", results.despesasPagas);
  }

  console.log("\n✅ Concluído");
  if (!APPLY) console.log("   (rodou em dry-run; use --apply pra gravar)");
})();
