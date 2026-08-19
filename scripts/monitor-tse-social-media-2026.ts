#!/usr/bin/env npx tsx
/**
 * P1.1 Monitor — Social Media 2026
 *
 * Monitora CDN TSE pra publicação de redes_sociais 2026.
 * Cuando detectada, faz upsert em candidate_social_media.
 *
 * Uso:
 *   npx tsx scripts/monitor-tse-social-media-2026.ts          # check once
 *   npx tsx scripts/monitor-tse-social-media-2026.ts --watch  # contínuo (cron: daily 07:00 UTC)
 */
import * as fs from "fs";
import * as path from "path";

const TSE_REDES_URLS = {
  2026: "https://cdn.tse.jus.br/estatistica/sead/odsele/candidato/candidato_2026_BR.zip",
  // Dados de redes sociais estão no arquivo candidato_2026_BR, campo instagram_handle / twitter_handle
};

const CACHE_FILE = path.join(process.cwd(), ".env.local.p11-monitor");

async function checkTsePublication(year: number): Promise<{
  exists: boolean;
  size?: number;
  lastModified?: Date;
  error?: string;
}> {
  const url = TSE_REDES_URLS[year as keyof typeof TSE_REDES_URLS];
  if (!url) return { exists: false, error: `No URL configured for ${year}` };

  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (res.status === 404) return { exists: false };
    if (!res.ok) return { exists: false, error: `HTTP ${res.status}` };

    return {
      exists: true,
      size: res.headers.get("content-length") ? parseInt(res.headers.get("content-length")!) : undefined,
      lastModified: res.headers.get("last-modified") ? new Date(res.headers.get("last-modified")!) : undefined,
    };
  } catch (e) {
    return { exists: false, error: (e as Error).message };
  }
}

function readLastCheck(): { timestamp: Date; detected: boolean } | null {
  try {
    const content = fs.readFileSync(CACHE_FILE, "utf-8");
    const data = JSON.parse(content);
    return { timestamp: new Date(data.timestamp), detected: data.detected };
  } catch {
    return null;
  }
}

function writeLastCheck(detected: boolean) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: new Date().toISOString(), detected }, null, 2));
}

async function main() {
  console.log("\n🔍 P1.1 Monitor — TSE Social Media 2026");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const result = await checkTsePublication(2026);
  const lastCheck = readLastCheck();

  if (result.exists) {
    console.log("✅ TSE Social Media 2026 DETECTADO!");
    console.log(`   Size: ${result.size ? (result.size / 1024 / 1024).toFixed(1) + "MB" : "desconhecido"}`);
    console.log(`   Last Modified: ${result.lastModified?.toISOString() ?? "desconhecido"}`);

    if (!lastCheck?.detected) {
      console.log("\n🔔 ALERTA: Publicação recente detectada!");
      console.log("   Próximas ações:");
      console.log("   1. npx tsx scripts/ingest-pesqele.ts --apply  (atualizar pesqele_registry)");
      console.log("   2. npx tsx scripts/import-social-media-2026.ts --apply  (popular candidate_social_media)");
      console.log("   3. UPDATE candidate_social_media SET year=2026 (marcar cobertura)");
      console.log("   4. Remover avisos 'dados 2022' em /redes-sociais");
      writeLastCheck(true);
    } else {
      console.log("   (Já registrado em cache — nenhuma ação automática)");
    }
  } else {
    console.log("❌ TSE Social Media 2026 NÃO DISPONÍVEL YET");
    console.log(`   Erro: ${result.error || "HTTP 404"}`);
    console.log("   Próxima verificação automática: daily 07:00 UTC (configure cron)");

    if (lastCheck?.detected) {
      console.log("\n   ⚠️  Cache indica que foi detectado antes — verificar manualmente:");
      console.log(`   ${TSE_REDES_URLS[2026]}`);
    }
    writeLastCheck(false);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch(console.error);
