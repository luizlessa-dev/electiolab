#!/usr/bin/env npx tsx
/**
 * Ingest histórico eleitoral dos candidatos 2026.
 *
 * Para cada candidato com CPF na nossa base, busca em quais eleições anteriores
 * ele disputou (2018, 2022, 2024) e qual foi o resultado.
 *
 * Datasets TSE:
 *   - votacao_candidato_munzona_{ano}.zip — votação por município/zona
 *   - consulta_cand_{ano}.zip — lookup SQ_CANDIDATO ↔ NR_CPF + DS_SIT_TOT_TURNO
 *
 * Uso:
 *   npx tsx scripts/ingest-tse-prior-results.ts                 # dry-run
 *   npx tsx scripts/ingest-tse-prior-results.ts --apply         # grava
 *   npx tsx scripts/ingest-tse-prior-results.ts --apply --year=2024
 */

import { createClient } from "@supabase/supabase-js";
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawn } from "child_process";
import * as readline from "readline";

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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const APPLY = process.argv.includes("--apply");
const YEAR_ARG = process.argv.find((a) => a.startsWith("--year="))?.split("=")[1];
const ANOS = YEAR_ARG ? [parseInt(YEAR_ARG)] : [2024, 2022, 2018];

const CACHE_DIR = path.join(os.tmpdir(), "tse-cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

const TSE_VOT = (a: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_${a}.zip`;
const TSE_CAND = (a: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${a}.zip`;

async function downloadCached(url: string, name: string): Promise<Buffer> {
  const cachePath = path.join(CACHE_DIR, name);
  if (fs.existsSync(cachePath)) {
    const stat = fs.statSync(cachePath);
    if (stat.size > 1024) {
      console.log(`📂 cache: ${name} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
      return fs.readFileSync(cachePath);
    }
  }
  console.log(`⬇️  ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(cachePath, buf);
  console.log(`✅ ${(buf.length / 1024 / 1024).toFixed(1)}MB salvo`);
  return buf;
}

function parseCsv(buf: Buffer): { header: string[]; rows: string[][] } {
  const text = iconv.decode(buf, "latin1");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return { header: [], rows: [] };
  const splitRow = (l: string) => l.split(";").map((c) => c.replace(/^"|"$/g, "").trim());
  return {
    header: splitRow(lines[0]),
    rows: lines.slice(1).filter((l) => l.length > 10).map(splitRow),
  };
}

const NULO = (s?: string): string | null => {
  if (!s) return null;
  const t = s.trim();
  if (!t || ["#NULO#", "#NE#", "-1", "NÃO INFORMADO", "N/A"].includes(t)) return null;
  return t;
};

const cleanCpf = (s?: string): string | null => {
  const t = NULO(s);
  if (!t) return null;
  return t.replace(/\D/g, "").padStart(11, "0").slice(-11);
};

// Map TSE cargo codes to nosso enum
const CARGO_MAP: Record<string, string> = {
  "1": "presidente",
  "2": "vice-presidente",
  "3": "governador",
  "4": "vice-governador",
  "5": "senador",
  "6": "deputado_federal",
  "7": "deputado_estadual",
  "8": "deputado_distrital",
  "9": "1o-suplente",
  "10": "2o-suplente",
  "11": "prefeito",
  "12": "vice-prefeito",
  "13": "vereador",
};

// Status de eleição (DS_SIT_TOT_TURNO)
function normalizeStatus(s: string | null): string {
  if (!s) return "nao_eleito";
  const u = s.toUpperCase();
  if (u.includes("ELEITO POR QP") || u.includes("ELEITO POR MÉDIA") || u === "ELEITO") return "eleito";
  if (u.includes("SUPLENTE")) return "suplente";
  if (u.includes("2º TURNO") || u.includes("2 TURNO")) return "2t_disputou";
  if (u.includes("RENÚNCIA") || u.includes("RENUNCIA")) return "renunciou";
  if (u.includes("CASSAD")) return "cassado";
  return "nao_eleito";
}

// ─────────────────────────────────────────────────────────────────
async function loadOurCandidatesByCpf(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let from = 0;
  while (true) {
    const { data } = await sb
      .from("candidates")
      .select("id, cpf")
      .not("cpf", "is", null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const c of data) {
      const cpf = cleanCpf(c.cpf as string);
      if (cpf) map.set(cpf, c.id as string);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  return map;
}

// SQ_CANDIDATO → CPF via consulta_cand
async function buildSqToCpf(ano: number): Promise<Map<string, { cpf: string; status: string }>> {
  const map = new Map<string, { cpf: string; status: string }>();
  let buf: Buffer;
  try {
    buf = await downloadCached(TSE_CAND(ano), `consulta_cand_${ano}.zip`);
  } catch (e) {
    console.warn(`⚠️  consulta_cand ${ano} skip:`, (e as Error).message);
    return map;
  }
  const zip = new AdmZip(buf);
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.toLowerCase().endsWith(".csv")) continue;
    if (/_brasil\.csv$/i.test(entry.entryName)) continue;
    const { header, rows } = parseCsv(entry.getData());
    const iSq = header.indexOf("SQ_CANDIDATO");
    const iCpf = header.indexOf("NR_CPF_CANDIDATO");
    const iSit = header.indexOf("DS_SIT_TOT_TURNO");
    if (iSq < 0 || iCpf < 0) continue;
    for (const r of rows) {
      const sq = NULO(r[iSq]);
      const cpf = cleanCpf(r[iCpf]);
      if (!sq || !cpf) continue;
      const status = NULO(r[iSit] ?? "") ?? "";
      map.set(sq, { cpf, status });
    }
  }
  return map;
}

type Aggregate = {
  candidate_id: string;
  cpf_clean: string;
  year: number;
  round: number;
  election_type: string;
  state: string;
  city: string | null;
  party: string;
  total_votes: number;
  result_status: string;
};

const STATUS_RANK = ["eleito", "2t_disputou", "suplente", "renunciou", "cassado", "nao_eleito"];

function processRow(
  cols: string[],
  colIdx: { iSq: number; iCargo: number; iSgUF: number; iMun: number; iPart: number; iVotos: number; iTurno: number; iSit: number },
  ano: number,
  sqMap: Map<string, { cpf: string; status: string }>,
  ourCpfs: Map<string, string>,
  aggMap: Map<string, Aggregate>,
) {
  const sq = NULO(cols[colIdx.iSq]);
  if (!sq) return;
  const sqInfo = sqMap.get(sq);
  if (!sqInfo) return;
  const candidate_id = ourCpfs.get(sqInfo.cpf);
  if (!candidate_id) return;

  const cargoCod = NULO(cols[colIdx.iCargo]) ?? "";
  const election_type = CARGO_MAP[cargoCod] ?? `cargo_${cargoCod}`;
  const state = NULO(cols[colIdx.iSgUF]) ?? "";
  const city = NULO(cols[colIdx.iMun]);
  const party = NULO(cols[colIdx.iPart]) ?? "";
  const round = parseInt(cols[colIdx.iTurno] ?? "1") || 1;
  const status = normalizeStatus(NULO(cols[colIdx.iSit]) ?? sqInfo.status);
  const votes = parseInt(cols[colIdx.iVotos] ?? "0") || 0;

  const key = `${candidate_id}|${ano}|${round}|${election_type}|${state}|${city ?? ""}`;
  const cur = aggMap.get(key) ?? {
    candidate_id, cpf_clean: sqInfo.cpf, year: ano, round, election_type, state, city, party,
    total_votes: 0, result_status: status,
  };
  cur.total_votes += votes;
  if (STATUS_RANK.indexOf(status) < STATUS_RANK.indexOf(cur.result_status)) {
    cur.result_status = status;
  }
  aggMap.set(key, cur);
}

// Streaming parse para CSVs gigantes via unzip + readline
async function streamCsv(zipPath: string, entryName: string, onLine: (cols: string[], headerCols: string[]) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("unzip", ["-p", zipPath, entryName]);
    let buffer = Buffer.alloc(0);
    let header: string[] | null = null;

    proc.stdout.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      let nl: number;
      while ((nl = buffer.indexOf(0x0a)) !== -1) {
        const lineBuf = buffer.subarray(0, nl);
        buffer = buffer.subarray(nl + 1);
        const line = iconv.decode(lineBuf, "latin1").replace(/\r$/, "");
        if (line.length < 5) continue;
        const cols = line.split(";").map((c) => c.replace(/^"|"$/g, "").trim());
        if (!header) {
          header = cols;
        } else {
          onLine(cols, header);
        }
      }
    });
    proc.stderr.on("data", () => {}); // silence
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(`unzip exit ${code}`));
      else resolve();
    });
    proc.on("error", reject);
  });
}

async function ingestYear(ano: number, ourCpfs: Map<string, string>) {
  console.log(`\n━━━ Ano ${ano} ━━━`);
  const sqMap = await buildSqToCpf(ano);
  console.log(`  🔗 SQ→CPF lookup: ${sqMap.size.toLocaleString("pt-BR")} entradas`);

  let buf: Buffer;
  const zipFilename = `votacao_candidato_munzona_${ano}.zip`;
  const zipPath = path.join(CACHE_DIR, zipFilename);
  try {
    buf = await downloadCached(TSE_VOT(ano), zipFilename);
  } catch (e) {
    console.warn(`⚠️  Skip ${ano}:`, (e as Error).message);
    return;
  }

  const zip = new AdmZip(buf);
  const aggMap = new Map<string, Aggregate>();
  let totalLines = 0;

  for (const entry of zip.getEntries()) {
    if (!entry.entryName.toLowerCase().endsWith(".csv")) continue;
    if (/_brasil\.csv$/i.test(entry.entryName)) continue;
    if (/_br\.csv$/i.test(entry.entryName)) continue;

    // Sempre via streaming: parseCsv materializa o ficheiro inteiro em string
    // e estoura ERR_STRING_TOO_LONG em CSVs grandes (TSE nacional).
    const uncompressedMB = entry.header.size / 1024 / 1024;
    console.log(`  📥 streaming ${entry.entryName} (${uncompressedMB.toFixed(0)}MB)…`);
    let lineCount = 0;
    let headerCols: string[] | null = null;
    let colIdx: { iSq: number; iCargo: number; iSgUF: number; iMun: number; iPart: number; iVotos: number; iTurno: number; iSit: number } | null = null;
    await streamCsv(zipPath, entry.entryName, (cols, h) => {
      if (!headerCols) {
        headerCols = h;
        colIdx = {
          iSq: h.indexOf("SQ_CANDIDATO"),
          iCargo: h.indexOf("CD_CARGO"),
          iSgUF: h.indexOf("SG_UF"),
          iMun: h.indexOf("NM_MUNICIPIO"),
          iPart: h.indexOf("SG_PARTIDO"),
          iVotos: h.indexOf("QT_VOTOS_NOMINAIS"),
          iTurno: h.indexOf("NR_TURNO"),
          iSit: h.indexOf("DS_SIT_TOT_TURNO"),
        };
      }
      if (!colIdx || colIdx.iSq < 0 || colIdx.iVotos < 0) return;
      lineCount++;
      totalLines++;
      processRow(cols, colIdx, ano, sqMap, ourCpfs, aggMap);
    });
    console.log(`     ${lineCount.toLocaleString("pt-BR")} linhas processadas`);
  }

  const records = Array.from(aggMap.values());
  console.log(`  📊 ${ano}: ${totalLines.toLocaleString("pt-BR")} linhas → ${records.length} resultados agregados (${new Set(records.map((r) => r.candidate_id)).size} candidatos únicos)`);

  if (!APPLY) return;
  const BATCH = 500;
  let n = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const slice = records.slice(i, i + BATCH);
    const { error } = await sb
      .from("prior_election_results")
      .upsert(slice, { onConflict: "candidate_id,year,round,election_type,state,city", ignoreDuplicates: true });
    if (error) {
      console.error(`  ❌ ${error.message}`);
      console.error(`  sample:`, JSON.stringify(slice[0]).slice(0, 250));
      break;
    }
    n += slice.length;
  }
  console.log(`  💾 prior_election_results: ${n}/${records.length} inseridos`);
}

(async () => {
  console.log(`\n🇧🇷 TSE Prior Results Ingest`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);
  console.log(`   Anos: ${ANOS.join(", ")}`);

  const ourCpfs = await loadOurCandidatesByCpf();
  console.log(`👥 ${ourCpfs.size} candidatos com CPF na base`);

  for (const ano of ANOS) {
    await ingestYear(ano, ourCpfs);
  }

  console.log("\n✅ Concluído");
})();
