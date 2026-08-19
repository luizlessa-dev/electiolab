#!/usr/bin/env npx tsx
/**
 * Ingest TSE redes sociais de candidatos — popula candidate_social_media a
 * partir do arquivo `rede_social_candidato_<ano>.zip` do TSE.
 *
 * Achado em 2026-08-19 durante investigação de acesso ao TSE: esse dataset
 * já estava publicado (48.498 linhas no _BRASIL.csv pra 2026), mas
 * ElectioLab não tinha ingestor — só um script antigo baseado em CSV manual
 * (scrape-social-media-2026.ts) com schema errado (colunas
 * instagram_handle/twitter_handle direto em candidate_social_media, que na
 * verdade é uma linha por rede social com coluna `platform`).
 *
 * O TSE não expõe plataforma como coluna — só DS_URL (às vezes URL
 * completa, às vezes handle solto tipo "@fulano"). Plataforma é inferida do
 * domínio da URL; URLs sem domínio reconhecível (handle solto) ficam como
 * platform "outro" — ainda salvas (fica no dado bruto pra quem quiser
 * reprocessar), não descartadas.
 *
 * Uso:
 *   npx tsx scripts/ingest-tse-redes-sociais.ts --year=2026
 *   npx tsx scripts/ingest-tse-redes-sociais.ts --year=2026 --apply
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import {
  NULO,
  downloadCachedStream,
  listZipMembers,
  streamZipCsvRows,
  resolveColumns,
  withRetry,
  type FieldSpec,
} from "./lib/tse-csv";

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
const BATCH_SIZE = 500;

const TSE_ZIP_URL = (ano: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/rede_social_candidato_${ano}.zip`;

// ─────────────────────────────────────────────────────────────────
// Plataforma a partir da URL — TSE só dá DS_URL, sem coluna própria
// ─────────────────────────────────────────────────────────────────
const PLATFORM_PATTERNS: Array<[RegExp, string]> = [
  [/instagram\.com/i, "instagram"],
  [/(twitter\.com|x\.com)/i, "twitter"],
  [/facebook\.com|fb\.com/i, "facebook"],
  [/tiktok\.com/i, "tiktok"],
  [/youtube\.com|youtu\.be/i, "youtube"],
  [/threads\.net/i, "threads"],
  [/kwai\.com/i, "kwai"],
  [/linkedin\.com/i, "linkedin"],
  [/telegram\.(me|org)|t\.me/i, "telegram"],
  [/whatsapp\.com|wa\.me/i, "whatsapp"],
];

function detectPlatform(url: string): string {
  for (const [pattern, name] of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return name;
  }
  return "outro";
}

function extractHandle(url: string, platform: string): string | null {
  const clean = url.trim().replace(/^"|"$/g, "");
  if (clean.startsWith("@")) return clean.slice(1);
  if (platform === "outro") return null;
  try {
    const withProto = clean.match(/^https?:\/\//i) ? clean : `https://${clean}`;
    const u = new URL(withProto);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[0] || null;
  } catch {
    return null;
  }
}

function normalizeUrl(raw: string): string {
  const clean = raw.trim().replace(/^"|"$/g, "");
  if (clean.startsWith("@")) return clean;
  return clean.match(/^https?:\/\//i) ? clean : `https://${clean}`;
}

// ─────────────────────────────────────────────────────────────────
// Candidatos por SQ_CANDIDATO (= candidates.tse_id) — ver
// ingest-tse-prestacao-contas.ts pro achado de que CPF vem mascarado em
// alguns datasets TSE; aqui nem existe CPF na fonte, só SQ_CANDIDATO.
// ─────────────────────────────────────────────────────────────────
async function loadCandidatesBySqCandidato(): Promise<Map<string, { id: string; cpf: string | null }>> {
  const map = new Map<string, { id: string; cpf: string | null }>();
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from("candidates")
      .select("id, cpf, tse_id")
      .not("tse_id", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const c of data) {
      if (c.tse_id) map.set(c.tse_id as string, { id: c.id as string, cpf: c.cpf as string | null });
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`👥 ${map.size} candidatos com tse_id na base`);
  return map;
}

// ─────────────────────────────────────────────────────────────────
// Parsing do CSV — header real: DT_GERACAO, HH_GERACAO, AA_ELEICAO, SG_UF,
// CD_TIPO_ELEICAO, NM_TIPO_ELEICAO, CD_ELEICAO, DS_ELEICAO, SQ_CANDIDATO,
// NR_ORDEM_REDE_SOCIAL, DS_URL
// ─────────────────────────────────────────────────────────────────
const REDES_SPECS: FieldSpec[] = [
  { field: "sqCandidato", candidates: ["SQ_CANDIDATO"] },
  { field: "uf", candidates: ["SG_UF"] },
  { field: "url", candidates: ["DS_URL"] },
];

async function main() {
  console.log(`\n📱 TSE Redes Sociais — Ingest`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"} | Ano: ${YEAR}`);

  const zipPath = await downloadCachedStream(
    TSE_ZIP_URL(YEAR),
    `rede_social_candidato_${YEAR}.zip`,
  );
  const allMembers = listZipMembers(zipPath);
  const member = allMembers.find((m) => new RegExp(`_${YEAR}_BRASIL\\.csv$`, "i").test(m));
  if (!member) {
    console.error(`❌ Arquivo _BRASIL.csv não encontrado no ZIP. Membros: ${allMembers.join(", ")}`);
    process.exit(1);
  }
  console.log(`📦 Usando ${member} (consolidado nacional)`);

  const bySqCandidato = await loadCandidatesBySqCandidato();

  let cols: Record<string, string | null> | null = null;
  let batch: Record<string, unknown>[] = [];
  let totalRows = 0;
  let matched = 0;
  let unmatched = 0;
  let byPlatform: Record<string, number> = {};

  async function flush() {
    if (batch.length === 0) return;
    // Dedup por chave natural dentro do lote (retificação duplicada na fonte)
    const deduped = new Map<string, Record<string, unknown>>();
    for (const row of batch) {
      const key = `${row.candidate_id}|${row.election_year}|${row.url}`;
      deduped.set(key, row);
    }
    const rows = Array.from(deduped.values());
    if (APPLY) {
      await withRetry(async () => {
        const { error } = await sb
          .from("candidate_social_media")
          .upsert(rows, { onConflict: "candidate_id,election_year,url" });
        if (error) throw new Error(error.message);
      }, "upsert candidate_social_media");
    }
    batch = [];
  }

  for await (const row of streamZipCsvRows(zipPath, member)) {
    if (!cols) {
      const header = Object.keys(row);
      const { map, missing } = resolveColumns(header, REDES_SPECS);
      cols = map;
      console.log(`   header: ${header.join(", ")}`);
      if (missing.length) console.warn(`   ⚠️  campos não resolvidos: ${missing.join(", ")}`);
    }
    const c = cols;
    totalRows++;

    const sqCandidato = c.sqCandidato ? NULO(row[c.sqCandidato]) : null;
    const rawUrl = c.url ? NULO(row[c.url]) : null;
    if (!sqCandidato || !rawUrl) continue;

    const cand = bySqCandidato.get(sqCandidato);
    if (!cand) {
      unmatched++;
      continue;
    }
    matched++;

    const url = normalizeUrl(rawUrl);
    const platform = detectPlatform(url);
    byPlatform[platform] = (byPlatform[platform] ?? 0) + 1;
    const handle = extractHandle(rawUrl, platform);

    batch.push({
      candidate_id: cand.id,
      cpf: cand.cpf,
      election_year: YEAR,
      platform,
      url,
      handle,
      source: "TSE",
    });

    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  console.log(`\n📊 Total: ${totalRows.toLocaleString("pt-BR")} linhas`);
  console.log(`   ✓ vinculadas a candidato: ${matched.toLocaleString("pt-BR")}`);
  console.log(`   ⚠️  sem candidato correspondente: ${unmatched.toLocaleString("pt-BR")}`);
  console.log(`\n   Por plataforma:`);
  for (const [p, n] of Object.entries(byPlatform).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${p}: ${n.toLocaleString("pt-BR")}`);
  }

  console.log(`\n✅ Concluído`);
  if (!APPLY) console.log("   (rodou em dry-run; use --apply pra gravar)");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
