/**
 * POST /api/admin/indexnow
 * Dispara ping IndexNow manual pra uma lista de URLs OU pra todo o sitemap.
 *
 * Body:
 *   { urls: string[] }      → pinga só essas URLs
 *   { all_sitemap: true }   → pinga todas as URLs do sitemap.xml (bulk)
 *
 * Header: Authorization: Bearer INGEST_SECRET_KEY
 *
 * Uso típico:
 *   - Após deploy de mudança grande em template, rodar `all_sitemap: true`
 *     pra dizer ao Bing "tudo mudou, re-crawla"
 *   - Pontual: passar 1-10 URLs específicas que precisam de re-indexação
 */

import { NextResponse } from "next/server";
import { pingIndexNow } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

function authorize(req: Request): NextResponse | null {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const secret = process.env.INGEST_SECRET_KEY;
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function fetchSitemapUrls(): Promise<string[]> {
  const res = await fetch("https://electiolab.com/sitemap.xml", {
    headers: { "User-Agent": "ElectioLab IndexNow Sync" },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) ?? [];
  return matches.map((m) => m.replace(/<\/?loc>/g, ""));
}

export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  let urls: string[] = [];

  if (body.all_sitemap === true) {
    urls = await fetchSitemapUrls();
    if (urls.length === 0) {
      return NextResponse.json(
        { error: "Sitemap vazio ou inacessível" },
        { status: 500 },
      );
    }
  } else if (Array.isArray(body.urls)) {
    urls = body.urls;
  } else {
    return NextResponse.json(
      { error: "Body precisa ter { urls: [...] } ou { all_sitemap: true }" },
      { status: 400 },
    );
  }

  // IndexNow aceita até 10.000 por request, mas chunkar por 100 é mais
  // seguro (alguns endpoints engasgam com payloads grandes).
  const CHUNK = 100;
  const results: Array<{ batch: number; ok: boolean; status: number; urls_sent: number }> = [];

  for (let i = 0; i < urls.length; i += CHUNK) {
    const batch = urls.slice(i, i + CHUNK);
    const r = await pingIndexNow(batch);
    results.push({ batch: Math.floor(i / CHUNK), ok: r.ok, status: r.status, urls_sent: r.urls_sent });
    // Pequena espera entre chunks pra não estressar o endpoint
    if (i + CHUNK < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  const totalSent = results.reduce((s, r) => s + r.urls_sent, 0);
  const allOk = results.every((r) => r.ok);

  return NextResponse.json({
    success: allOk,
    total_urls: urls.length,
    batches: results.length,
    urls_sent: totalSent,
    results,
  });
}
