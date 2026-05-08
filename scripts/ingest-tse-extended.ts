#!/usr/bin/env npx tsx
/**
 * Ingest TSE extended datasets (3-em-1):
 *   1. tse_bens         → candidate_assets        (bens individuais)
 *   2. tse_redes_sociais → candidate_social_media (redes oficiais)
 *   3. tse_fefc         → candidate_fefc          (Fundo Especial)
 *
 * Estratégia:
 *   - Baixa ZIPs bulk do TSE (cdn.tse.jus.br) com cache local em /tmp/tse-cache
 *   - Filtra por CPF dos candidatos que já estão na nossa base (295 candidatos)
 *   - Insere em batch (1000 linhas por chamada)
 *
 * Uso:
 *   npx tsx scripts/ingest-tse-extended.ts                      # dry-run, mostra estatísticas
 *   npx tsx scripts/ingest-tse-extended.ts --apply              # grava no banco
 *   npx tsx scripts/ingest-tse-extended.ts --apply --only=bens  # ingere só um dataset
 *   npx tsx scripts/ingest-tse-extended.ts --year=2022          # filtra por ano
 *
 * Dependências (já instaladas para ingest-tse-candidaturas):
 *   adm-zip, iconv-lite
 */

import { createClient } from "@supabase/supabase-js";
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const YEAR_ARG = process.argv.find((a) => a.startsWith("--year="))?.split("=")[1];

const ANOS = YEAR_ARG ? [parseInt(YEAR_ARG)] : [2024, 2022];
const CACHE_DIR = path.join(os.tmpdir(), "tse-cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────
// URLs TSE
// ─────────────────────────────────────────────────────────────────
const TSE_BENS = (a: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_${a}.zip`;
const TSE_REDES = (a: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/rede_social_candidato_${a}_BR.zip`;
const TSE_FEFC = (a: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_${a}.zip`;
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

// ─────────────────────────────────────────────────────────────────
// CSV parser (TSE format: latin1, ; delimited, " quoted, #NULO# = null)
// ─────────────────────────────────────────────────────────────────
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

const NULO = (s: string | undefined): string | null => {
  if (!s) return null;
  const t = s.trim();
  if (!t || ["#NULO#", "#NE#", "-1", "NÃO INFORMADO", "N/A"].includes(t)) return null;
  return t;
};

const parseValor = (s: string | undefined): number | null => {
  const t = NULO(s);
  if (!t) return null;
  const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
};

const cleanCpf = (s: string | undefined): string | null => {
  const t = NULO(s);
  if (!t) return null;
  return t.replace(/\D/g, "").padStart(11, "0").slice(-11);
};

// ─────────────────────────────────────────────────────────────────
// Carrega CPFs dos candidatos no banco
// ─────────────────────────────────────────────────────────────────
type CandRef = { id: string; cpf: string; name: string };

async function loadCandidates(): Promise<Map<string, CandRef>> {
  const map = new Map<string, CandRef>();
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from("candidates")
      .select("id, cpf, name")
      .not("cpf", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const c of data) {
      const cpf = cleanCpf(c.cpf as string);
      if (cpf) map.set(cpf, { id: c.id as string, cpf, name: c.name as string });
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`👥 ${map.size} candidatos com CPF na base`);
  return map;
}

// ─────────────────────────────────────────────────────────────────
// Helper: insert em batches
// ─────────────────────────────────────────────────────────────────
async function insertBatch<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict?: string,
) {
  if (!APPLY) return;
  const BATCH = 500;
  let n = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const q = onConflict
      ? sb.from(table).upsert(slice, { onConflict, ignoreDuplicates: true })
      : sb.from(table).insert(slice);
    const { error } = await q;
    if (error) {
      console.error(`❌ Insert ${table}: ${error.message}`);
      console.error(`   row sample:`, JSON.stringify(slice[0]).slice(0, 200));
      break;
    }
    n += slice.length;
  }
  console.log(`  💾 ${table}: ${n}/${rows.length} inseridos`);
}

// ─────────────────────────────────────────────────────────────────
// Lookup SQ_CANDIDATO → CPF (necessário para bens, que não tem CPF)
// ─────────────────────────────────────────────────────────────────
async function buildSqToCpf(ano: number): Promise<Map<string, string>> {
  const map = new Map<string, string>();
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
    if (iSq < 0 || iCpf < 0) continue;
    for (const r of rows) {
      const sq = NULO(r[iSq]);
      const cpf = cleanCpf(r[iCpf]);
      if (sq && cpf) map.set(sq, cpf);
    }
  }
  console.log(`  🔗 SQ→CPF lookup ${ano}: ${map.size.toLocaleString("pt-BR")} entradas`);
  return map;
}

// ─────────────────────────────────────────────────────────────────
// 1. INGEST BENS
// ─────────────────────────────────────────────────────────────────
async function ingestBens(byCpf: Map<string, CandRef>) {
  console.log("\n━━━ TSE_BENS ━━━");
  for (const ano of ANOS) {
    const sqToCpf = await buildSqToCpf(ano);
    if (sqToCpf.size === 0) continue;

    let buf: Buffer;
    try {
      buf = await downloadCached(TSE_BENS(ano), `bem_candidato_${ano}.zip`);
    } catch (e) {
      console.warn(`⚠️  Skip ${ano}:`, (e as Error).message);
      continue;
    }
    const zip = new AdmZip(buf);
    const inserted: Record<string, unknown>[] = [];
    let totalRows = 0;

    for (const entry of zip.getEntries()) {
      if (!entry.entryName.toLowerCase().endsWith(".csv")) continue;
      if (/_brasil\.csv$/i.test(entry.entryName)) continue;
      const { header, rows } = parseCsv(entry.getData());
      const iSq = header.indexOf("SQ_CANDIDATO");
      const iOrdem = header.indexOf("NR_ORDEM_CANDIDATO");
      const iTipoCod = header.indexOf("CD_TIPO_BEM_CANDIDATO");
      const iTipo = header.indexOf("DS_TIPO_BEM_CANDIDATO");
      const iDesc = header.indexOf("DS_BEM_CANDIDATO");
      const iValor = header.indexOf("VR_BEM_CANDIDATO");
      if (iSq < 0) continue;

      for (const r of rows) {
        totalRows++;
        const sq = NULO(r[iSq]);
        if (!sq) continue;
        const cpf = sqToCpf.get(sq);
        if (!cpf) continue;
        const ref = byCpf.get(cpf);
        if (!ref) continue;
        inserted.push({
          candidate_id: ref.id,
          cpf,
          election_year: ano,
          asset_order: parseInt(r[iOrdem] ?? "0") || null,
          asset_type_code: NULO(r[iTipoCod]),
          asset_type_name: NULO(r[iTipo]),
          description: NULO(r[iDesc]),
          value_brl: parseValor(r[iValor]),
        });
      }
    }
    console.log(`  📊 ${ano}: ${totalRows.toLocaleString("pt-BR")} linhas no TSE → ${inserted.length} match com nossa base`);
    await insertBatch("candidate_assets", inserted);
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. INGEST REDES SOCIAIS
// ─────────────────────────────────────────────────────────────────
function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("instagram.com") || u.includes("instagr.am")) return "instagram";
  if (u.includes("facebook.com") || u.includes("fb.com")) return "facebook";
  if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("threads.net")) return "threads";
  if (u.includes("kwai.com")) return "kwai";
  if (u.includes("t.me") || u.includes("telegram")) return "telegram";
  if (u.includes("whatsapp")) return "whatsapp";
  if (u.match(/\.com|\.com\.br|\.org/)) return "website";
  return "other";
}

function extractHandle(url: string, platform: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = u.pathname.replace(/^\/|\/$/g, "");
    if (["instagram", "twitter", "tiktok", "threads", "youtube"].includes(platform)) {
      return path.split("/")[0]?.replace(/^@/, "") || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function ingestRedesSociais(byCpf: Map<string, CandRef>) {
  console.log("\n━━━ TSE_REDES_SOCIAIS ━━━");
  for (const ano of ANOS) {
    const sqToCpf = await buildSqToCpf(ano);
    if (sqToCpf.size === 0) continue;

    let buf: Buffer;
    try {
      buf = await downloadCached(TSE_REDES(ano), `rede_social_candidato_${ano}_BR.zip`);
    } catch (e) {
      console.warn(`⚠️  Skip ${ano}:`, (e as Error).message);
      continue;
    }
    const zip = new AdmZip(buf);
    const inserted: Record<string, unknown>[] = [];
    let totalRows = 0;

    for (const entry of zip.getEntries()) {
      if (!entry.entryName.toLowerCase().endsWith(".csv")) continue;
      const { header, rows } = parseCsv(entry.getData());
      const iSq = header.indexOf("SQ_CANDIDATO");
      const iUrl = header.indexOf("DS_URL");
      if (iSq < 0 || iUrl < 0) continue;

      for (const r of rows) {
        totalRows++;
        const sq = NULO(r[iSq]);
        const url = NULO(r[iUrl]);
        if (!sq || !url) continue;
        const cpf = sqToCpf.get(sq);
        if (!cpf) continue;
        const ref = byCpf.get(cpf);
        if (!ref) continue;
        const platform = detectPlatform(url);
        inserted.push({
          candidate_id: ref.id,
          cpf,
          election_year: ano,
          platform,
          url: url.length > 500 ? url.slice(0, 500) : url,
          handle: extractHandle(url, platform),
        });
      }
    }
    console.log(`  📊 ${ano}: ${totalRows.toLocaleString("pt-BR")} linhas → ${inserted.length} match`);
    await insertBatch("candidate_social_media", inserted, "candidate_id,election_year,url");
  }
}

// ─────────────────────────────────────────────────────────────────
// 3. INGEST FEFC
// ─────────────────────────────────────────────────────────────────
async function ingestFefc(byCpf: Map<string, CandRef>) {
  console.log("\n━━━ TSE_FEFC ━━━");
  // FEFC vem dentro de prestação de contas — normalmente em receitas_candidatos.csv
  // Filtramos por DS_ORIGEM_RECEITA contendo "FUNDO ESPECIAL"
  for (const ano of ANOS) {
    let buf: Buffer;
    try {
      buf = await downloadCached(TSE_FEFC(ano), `prestacao_de_contas_eleitorais_candidatos_${ano}.zip`);
    } catch (e) {
      console.warn(`⚠️  Skip ${ano}:`, (e as Error).message);
      continue;
    }
    const zip = new AdmZip(buf);
    const fefcByCpf = new Map<string, { received: number; party: string | null }>();
    let totalRows = 0;

    for (const entry of zip.getEntries()) {
      const name = entry.entryName.toLowerCase();
      if (!name.endsWith(".csv")) continue;
      if (!name.includes("receitas") || /_brasil\.csv$/i.test(name)) continue;
      const { header, rows } = parseCsv(entry.getData());
      const iCpf = header.indexOf("NR_CPF_CANDIDATO");
      const iFonte = header.indexOf("DS_FONTE_RECEITA");
      const iValor = header.indexOf("VR_RECEITA");
      const iPartido = header.indexOf("SG_PARTIDO");
      if (iCpf < 0 || iValor < 0 || iFonte < 0) continue;

      for (const r of rows) {
        totalRows++;
        const fonte = (r[iFonte] ?? "").toUpperCase();
        // FEFC = "FUNDO ESPECIAL" (CD_FONTE_RECEITA=2)
        if (!fonte.includes("FUNDO ESPECIAL") && !fonte.includes("FEFC")) continue;
        const cpf = cleanCpf(r[iCpf]);
        if (!cpf) continue;
        if (!byCpf.has(cpf)) continue;
        const valor = parseValor(r[iValor]) ?? 0;
        const cur = fefcByCpf.get(cpf) ?? { received: 0, party: null };
        cur.received += valor;
        cur.party = cur.party ?? NULO(r[iPartido]);
        fefcByCpf.set(cpf, cur);
      }
    }

    const inserted = Array.from(fefcByCpf.entries()).map(([cpf, v]) => ({
      candidate_id: byCpf.get(cpf)!.id,
      cpf,
      election_year: ano,
      amount_received: v.received,
      party_acronym: v.party,
    }));
    console.log(`  📊 ${ano}: ${totalRows.toLocaleString("pt-BR")} receitas → ${inserted.length} candidatos com FEFC`);
    await insertBatch("candidate_fefc", inserted, "candidate_id,election_year");
  }
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🇧🇷 TSE Extended Ingest`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);
  console.log(`   Anos: ${ANOS.join(", ")}`);
  if (ONLY) console.log(`   Filtro: ${ONLY}`);

  const byCpf = await loadCandidates();
  if (byCpf.size === 0) {
    console.error("❌ Nenhum candidato com CPF na base. Rode ingest-tse-candidaturas primeiro.");
    process.exit(1);
  }

  if (!ONLY || ONLY === "bens") await ingestBens(byCpf);
  if (!ONLY || ONLY === "redes") await ingestRedesSociais(byCpf);
  if (!ONLY || ONLY === "fefc") await ingestFefc(byCpf);

  console.log("\n✅ Concluído");
  if (!APPLY) console.log("   (rodou em dry-run; use --apply pra gravar)");
})();
