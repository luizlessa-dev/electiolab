#!/usr/bin/env npx tsx
/**
 * P1.3 Frente 3 — Social Media Ingester
 *
 * Scrapes candidate social media (Instagram, TikTok, Twitter/X)
 * and aggregates engagement metrics daily.
 *
 * Usage:
 *   npx tsx scripts/ingest-social-media.ts --dry-run
 *   npx tsx scripts/ingest-social-media.ts --apply
 *   npx tsx scripts/ingest-social-media.ts --position PRESIDENTE --limit 5
 *
 * Schedule: Daily 03:00 UTC (cron/social-media-daily.ts)
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
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

interface SocialMetric {
  candidate_id: string;
  platform: "instagram" | "tiktok" | "twitter";
  handle: string;
  followers_count: number;
  following_count?: number;
  posts_last_7d: number;
  engagement_rate: number;
  avg_likes_per_post: number;
  avg_comments_per_post?: number;
  verified?: boolean;
}

async function getPresidentialCandidates(limit: number = 30) {
  console.log(`\n🔍 Buscando candidatos presidenciais...`);

  try {
    const { data } = await supabase
      .from("candidates")
      .select("id, name, editorial_bio")
      .eq("position", "PRESIDENTE")
      .limit(limit)
      .order("name");

    console.log(`   ✓ ${data?.length || 0} candidatos encontrados`);
    return data || [];
  } catch (e) {
    console.error(`❌ Erro buscando candidatos:`, e);
    return [];
  }
}

// TODO: Implement platform-specific scrapers
async function scrapeInstagram(handle: string): Promise<SocialMetric | null> {
  // Placeholder: would use Playwright + Instagram web scraping
  console.log(`   [Instagram] ${handle} — NOT YET IMPLEMENTED`);
  return null;
}

async function scrapeTikTok(handle: string): Promise<SocialMetric | null> {
  // Placeholder: would use Playwright + TikTok web scraping
  console.log(`   [TikTok] ${handle} — NOT YET IMPLEMENTED`);
  return null;
}

async function scrapeTwitter(handle: string): Promise<SocialMetric | null> {
  // Placeholder: would use Twitter API v2 (elevated access required)
  console.log(`   [Twitter] ${handle} — NOT YET IMPLEMENTED`);
  return null;
}

async function main() {
  const DRY_RUN = process.argv.includes("--dry-run");
  const APPLY = process.argv.includes("--apply");
  const POSITION = process.argv.find((a) => a.startsWith("--position="))?.split("=")[1] || "PRESIDENTE";
  const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "30", 10);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 Ingest Social Media 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode: ${APPLY ? "✍️  APPLY" : DRY_RUN ? "🔍 DRY-RUN" : "🔍 DRY-RUN (default)"}
Position: ${POSITION}
Limit: ${LIMIT} candidates
  `);

  const candidates = await getPresidentialCandidates(LIMIT);
  if (candidates.length === 0) {
    console.log(`❌ No candidates found`);
    return;
  }

  console.log(`\n📥 Scraping social media...`);
  let scraped = 0;

  for (const candidate of candidates) {
    console.log(`\n   ${candidate.name}`);
    // TODO: Extract social handles from editorial_bio or dedicated field
    // For now, placeholder
    scraped++;
  }

  console.log(`\n📊 Resultados:`);
  console.log(`   Total scrapeado: ${scraped}`);
  console.log(`   Inserido: 0 (NOT YET IMPLEMENTED)`);

  if (APPLY) {
    console.log(`\n⏳ Aplicando ao banco de dados...`);
    console.log(`   (Apply feature not yet implemented)`);
  } else {
    console.log(`\n💡 Próximo: implementar scrapers (Playwright + APIs)`);
  }

  console.log("━".repeat(60) + "\n");
}

main().catch(console.error);
