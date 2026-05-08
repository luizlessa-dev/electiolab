#!/usr/bin/env npx tsx
/**
 * Ingest Google Ads Transparency Report (Brasil) → digital_ads.
 *
 * Fonte: https://storage.googleapis.com/political-csv/google-political-ads-transparency-bundle.zip
 * (atualizado pela Google semanalmente)
 *
 * Estratégia:
 *   1. Baixa o ZIP (~280MB) com cache local em /tmp/google-ads-cache/
 *   2. Extrai google-political-ads-advertiser-stats.csv (anunciantes)
 *   3. Filtra por Regions=BR e parseia Advertiser_Name no formato
 *      "ELEICAO {ANO} {NOME COMPLETO} {CARGO}"
 *   4. Match com candidates (full_name normalizado, com fuzzy fallback)
 *   5. Upsert em digital_ads com platform='google'
 *
 * Uso:
 *   npx tsx scripts/ingest-google-ads.ts            # dry-run
 *   npx tsx scripts/ingest-google-ads.ts --apply
 */

import { createClient } from "@supabase/supabase-js";
import AdmZip from "adm-zip";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
const APPLY = process.argv.includes("--apply");

const BUNDLE_URL =
  "https://storage.googleapis.com/political-csv/google-political-ads-transparency-bundle.zip";
const CACHE_DIR = path.join(os.tmpdir(), "google-ads-cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CARGOS = new Set([
  "presidente",
  "governador",
  "vice-governador",
  "senador",
  "deputado federal",
  "deputado estadual",
  "deputado distrital",
  "prefeito",
  "vice-prefeito",
  "vereador",
]);

/**
 * Parseia "ELEICAO 2022 SERGIO FERNANDO MORO SENADOR" → { ano, nome, cargo }
 */
function parseAdvertiser(raw: string): { ano: number; nome: string; cargo: string } | null {
  const m = raw.match(/^ELEICAO\s+(\d{4})\s+(.+)$/i);
  if (!m) return null;
  const ano = parseInt(m[1], 10);
  const rest = m[2].trim();
  // Cargo pode ser 1-3 palavras no final. Tentamos do mais longo pro mais curto.
  const words = rest.split(/\s+/);
  for (let n = 3; n >= 1; n--) {
    const tail = words.slice(-n).join(" ").toLowerCase();
    if (CARGOS.has(tail)) {
      return {
        ano,
        nome: words.slice(0, -n).join(" ").trim(),
        cargo: tail,
      };
    }
  }
  return null;
}

async function downloadBundle(): Promise<string> {
  const cacheZip = path.join(CACHE_DIR, "bundle.zip");
  // Cache de 6 dias (Google atualiza semanalmente)
  if (fs.existsSync(cacheZip)) {
    const ageMs = Date.now() - fs.statSync(cacheZip).mtimeMs;
    if (ageMs < 6 * 86400 * 1000) {
      console.log(`📦 Cache hit: ${cacheZip}`);
      return cacheZip;
    }
  }
  console.log(`⬇️  Baixando ${BUNDLE_URL} (~280MB)…`);
  const res = await fetch(BUNDLE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(cacheZip, buf);
  console.log(`✅ ${(buf.length / 1024 / 1024).toFixed(1)}MB salvo`);
  return cacheZip;
}

type AdvertiserRow = {
  advertiser_id: string;
  advertiser_name: string;
  total_creatives: number;
  spend_brl: number;
  ano: number;
  nome_parsed: string;
  cargo_parsed: string;
};

function extractBrAdvertisers(zipPath: string): AdvertiserRow[] {
  const zip = new AdmZip(zipPath);
  const entry = zip.getEntries().find((e) =>
    e.entryName.endsWith("google-political-ads-advertiser-stats.csv")
  );
  if (!entry) throw new Error("CSV não encontrado no zip");

  const text = entry.getData().toString("utf-8");
  const lines = text.split(/\r?\n/);
  const header = lines[0].split(",");
  const iId = header.indexOf("Advertiser_ID");
  const iName = header.indexOf("Advertiser_Name");
  const iRegions = header.indexOf("Regions");
  const iCreatives = header.indexOf("Total_Creatives");
  const iBrl = header.indexOf("Spend_BRL");

  const rows: AdvertiserRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // CSV simples — quotes raros aqui mas vale parser robusto
    const cols = parseCsvLine(line);
    if (!cols) continue;
    const regions = cols[iRegions] ?? "";
    if (!regions.includes("BR")) continue;
    const name = cols[iName] ?? "";
    const parsed = parseAdvertiser(name);
    if (!parsed) continue;
    rows.push({
      advertiser_id: cols[iId],
      advertiser_name: name,
      total_creatives: parseInt(cols[iCreatives] ?? "0", 10) || 0,
      spend_brl: parseFloat(cols[iBrl] ?? "0") || 0,
      ano: parsed.ano,
      nome_parsed: parsed.nome,
      cargo_parsed: parsed.cargo,
    });
  }
  return rows;
}

function parseCsvLine(line: string): string[] | null {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && (i === 0 || line[i - 1] !== "\\")) {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function main() {
  console.log(`▶️  Google Ads ingest — ${APPLY ? "APPLY" : "DRY RUN"}`);

  // 1. Carrega candidates + index
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, full_name, election:elections(state)")
    .eq("is_active", true);
  if (!candidates) {
    console.error("Sem candidatos");
    process.exit(1);
  }

  type Cand = { id: string; name: string; full_name: string | null; state: string | null };
  const candIdx = new Map<string, Cand[]>();
  const flatCands: Cand[] = (candidates as unknown as Array<{
    id: string;
    name: string;
    full_name: string | null;
    election: { state?: string | null }[] | { state?: string | null } | null;
  }>).map((c) => ({
    id: c.id,
    name: c.name,
    full_name: c.full_name,
    state: (Array.isArray(c.election) ? c.election[0] : c.election)?.state ?? null,
  }));

  for (const c of flatCands) {
    const keys = new Set<string>();
    if (c.full_name) keys.add(normalize(c.full_name));
    keys.add(normalize(c.name));
    for (const k of keys) {
      const arr = candIdx.get(k);
      if (arr) arr.push(c);
      else candIdx.set(k, [c]);
    }
  }
  console.log(`👥 ${flatCands.length} candidatos / ${candIdx.size} chaves no index`);

  // 2. Baixa + parseia Google bundle
  const zipPath = await downloadBundle();
  const advertisers = extractBrAdvertisers(zipPath);
  console.log(`📊 ${advertisers.length} anunciantes BR (eleições)`);

  // 3. Match
  let matched = 0;
  let skipped = 0;
  const upserts: Array<{
    candidate_id: string;
    cand_name: string;
    advertiser: AdvertiserRow;
  }> = [];

  for (const ad of advertisers) {
    if (ad.spend_brl <= 0) continue; // ignora declarados sem gasto BR
    const adNameNorm = normalize(ad.nome_parsed);
    let cands = candIdx.get(adNameNorm) ?? [];

    // Fuzzy: subset de tokens
    if (cands.length === 0) {
      const want = adNameNorm.split(" ").filter((t) => t.length >= 3);
      if (want.length === 0) continue;
      for (const c of flatCands) {
        const have = new Set(
          (c.full_name ?? c.name).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/)
        );
        if (want.every((t) => have.has(t))) {
          cands.push(c);
        }
      }
    }

    if (cands.length === 0) {
      skipped++;
      continue;
    }
    // Se múltiplos matches, escolhe o que bate UF do cargo (não temos mapa direto, então pega o 1º)
    const cand = cands[0];
    matched++;
    upserts.push({ candidate_id: cand.id, cand_name: cand.name, advertiser: ad });
  }

  console.log(`\n📈 ${matched} match / ${skipped} skip`);
  console.log(`\n🔬 Top 10 por gasto:`);
  upserts
    .sort((a, b) => b.advertiser.spend_brl - a.advertiser.spend_brl)
    .slice(0, 10)
    .forEach((u) =>
      console.log(
        `  ${u.cand_name.padEnd(30)} R$ ${u.advertiser.spend_brl.toLocaleString("pt-BR").padStart(12)} (${u.advertiser.total_creatives} ads, ${u.advertiser.cargo_parsed} ${u.advertiser.ano})`
      )
    );

  if (!APPLY) {
    console.log(`\n💡 Rode com --apply pra gravar (${upserts.length}).`);
    return;
  }

  console.log(`\n💾 Limpando entradas Google anteriores e gravando…`);
  await supabase.from("digital_ads").delete().eq("platform", "google");

  const rows = upserts.map((u) => ({
    candidate_id: u.candidate_id,
    platform: "google",
    ad_id: u.advertiser.advertiser_id,
    page_name: u.advertiser.advertiser_name,
    spend_lower: u.advertiser.spend_brl,
    spend_upper: u.advertiser.spend_brl, // Google publica valor exato
    creative_text: `${u.advertiser.total_creatives} criativos · ${u.advertiser.cargo_parsed} ${u.advertiser.ano}`,
  }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from("digital_ads").insert(batch);
    if (error) console.error(`  batch ${i}:`, error.message);
    else inserted += batch.length;
  }
  console.log(`✅ ${inserted} ads Google inseridos.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
