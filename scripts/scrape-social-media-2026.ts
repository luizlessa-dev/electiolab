#!/usr/bin/env npx tsx
/**
 * P1.1 Fallback — Custom Scraper Instagram/X
 *
 * Quando TSE atrasar, extrair redes sociais de 16.9k candidatos 2026.
 * Strategy: Pesquisa Google "candidate_name instagram" + verificação de handles.
 *
 * Usa: Puppeteer (headless browser) com rate limiting (1req/2s)
 *      + fallback manual CSV upload
 *
 * Uso:
 *   npx tsx scripts/scrape-social-media-2026.ts --candidates 500 --mode headless
 *   npx tsx scripts/scrape-social-media-2026.ts --import data/social_media_manual.csv --apply
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CandidateSocialHandle {
  candidate_id: string;
  candidate_name: string;
  instagram_handle?: string | null;
  twitter_handle?: string | null;
  tiktok_handle?: string | null;
  source?: "google-search" | "manual-csv" | "tse-official";
  verified?: boolean;
  found_at?: string; // URL onde foi encontrado
}

/**
 * Strategy 1: Google Search fallback
 * Não usamos Puppeteer (rate limits), mas oferecemos estrutura.
 * Em produção: usar API como SerpAPI ou Bright Data.
 */
async function googleSearchFallback(candidateName: string): Promise<{
  instagram?: string;
  twitter?: string;
  tiktok?: string;
}> {
  // Placeholder: sem implementação (requer API key paga ou scraper robusto)
  // Alternativa: usar @playwright/test com pool de workers limitado
  console.log(`   ⚠️  [UNIMPLEMENTED] Google search para: ${candidateName}`);
  return {};
}

/**
 * Strategy 2: Manual CSV Import
 * Usuário fornece CSV com colunas: candidate_name, instagram_handle, twitter_handle
 */
async function importFromCsv(filePath: string, apply: boolean = false): Promise<number> {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    return 0;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const header = lines[0].split(",").map((h) => h.trim());

  const nameIdx = header.indexOf("candidate_name");
  const igIdx = header.indexOf("instagram_handle");
  const twIdx = header.indexOf("twitter_handle");

  if (nameIdx < 0) {
    console.error("❌ Coluna 'candidate_name' não encontrada no CSV");
    return 0;
  }

  console.log(`📄 Importando ${lines.length - 1} registros do CSV...`);

  const records: CandidateSocialHandle[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(",").map((f) => f.trim());
    const name = fields[nameIdx];
    if (!name) continue;

    // Buscar candidate_id no banco
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("name", name)
      .eq("year", 2026)
      .single();

    if (!candidate) {
      console.log(`   ⚠️  Candidato não encontrado: ${name}`);
      continue;
    }

    records.push({
      candidate_id: candidate.id,
      candidate_name: name,
      instagram_handle: igIdx >= 0 ? fields[igIdx] || null : null,
      twitter_handle: twIdx >= 0 ? fields[twIdx] || null : null,
      source: "manual-csv",
      verified: false,
    });
  }

  console.log(`   ✓ ${records.length} registros mapeados`);

  if (!apply) {
    console.log("   ⚠️  Dry-run mode. Use --apply pra gravar.");
    return 0;
  }

  // Upsert em candidate_social_media
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from("candidate_social_media").upsert(
      batch.map((r) => ({
        candidate_id: r.candidate_id,
        instagram_handle: r.instagram_handle,
        twitter_handle: r.twitter_handle,
        tiktok_handle: r.tiktok_handle || null,
        source: r.source,
        verified: r.verified,
      })),
      { onConflict: "candidate_id" }
    );

    if (error) {
      console.error(`❌ Batch falhou:`, error.message);
      break;
    }

    inserted += batch.length;
    console.log(`   ✓ ${inserted}/${records.length} inseridos`);
  }

  return inserted;
}

/**
 * Strategy 3: Verificação paralela com Puppeteer
 * (Implementação futura — requer sessão com browser pool)
 */
async function verifyHandlesWithPuppeteer(
  handles: CandidateSocialHandle[],
  _maxWorkers: number = 5
): Promise<CandidateSocialHandle[]> {
  console.log(`\n🔍 Verificando ${handles.length} handles com Puppeteer...`);
  console.log("   ⚠️  [TODO] Implementar pool de workers (Puppeteer + rate limiting)");
  console.log("   Recomendação: usar Bright Data ou SerpAPI para Google Search");
  return handles;
}

async function main() {
  const IMPORT_CSV = process.argv.find((a) => a.startsWith("--import="))?.split("=")[1];
  const APPLY = process.argv.includes("--apply");
  const MODE = (process.argv.find((a) => a.startsWith("--mode="))?.split("=")[1] ||
    "csv-only") as "csv-only" | "google-search" | "headless";
  const CANDIDATES_LIMIT = parseInt(
    process.argv.find((a) => a.startsWith("--candidates="))?.split("=")[1] || "500"
  );

  console.log("\n📱 P1.1 Scraper — Social Media 2026 (Fallback)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Mode: ${MODE}, Apply: ${APPLY}, Limit: ${CANDIDATES_LIMIT}`);

  if (IMPORT_CSV) {
    console.log(`\n📥 Strategy: Manual CSV Import`);
    const imported = await importFromCsv(IMPORT_CSV, APPLY);
    console.log(`   Total: ${imported} registros`);
    return;
  }

  if (MODE === "google-search") {
    console.log(`\n🔎 Strategy: Google Search (${CANDIDATES_LIMIT} candidatos)`);
    console.log("   ⚠️  Requer API key de terceira (SerpAPI, Bright Data, etc)");
    console.log("   Comando: npx tsx scripts/scrape-social-media-2026.ts --import data/search_results.csv");
    return;
  }

  if (MODE === "headless") {
    console.log(`\n🤖 Strategy: Puppeteer Headless (${CANDIDATES_LIMIT} candidatos)`);
    console.log("   ⚠️  [TODO] Implementar browser pool com rate limiting");
    console.log("   Risco: Account bans, rate limiting by Instagram/X");
    console.log("   Alternativa: usar Apify actors pré-construídos");
    return;
  }

  console.log(`\n💡 CSV-only mode (recomendado)`);
  console.log("   Fluxo:");
  console.log("   1. Criar data/social_media_2026_manual.csv com: candidate_name, instagram_handle, twitter_handle");
  console.log("   2. Rodar: npx tsx scripts/scrape-social-media-2026.ts --import data/social_media_2026_manual.csv");
  console.log("   3. Revisar: verificar handles encontrados");
  console.log("   4. Aplicar: npx tsx scripts/scrape-social-media-2026.ts --import ... --apply");
  console.log("\n   Fontes manuais:");
  console.log("   • Proposta de Ouvidor (POO) — TSE publica currículo com redes sociais");
  console.log("   • Perfil Político API — dados estruturados");
  console.log("   • Busca Google: 'candidato nome instagram 2026'");
  console.log("   • LinkedIn, Wikipedia — perfis públicos");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch(console.error);
