/**
 * GET /api/cron/ingest-pesqele
 *
 * Removido do cron do Vercel em 2026-08-13 — redundante com a GitHub Action
 * `.github/workflows/ingest-pesqele.yml` (11:00 UTC), que já cobre essa
 * ingestão e ainda encadeia Wikipedia, draft matching e freshness check.
 * Rota mantida para disparo manual (mesma auth CRON_SECRET), não agendada.
 *
 * Fase A: baixa pesquisa_eleitoral_2026.zip do CDN do TSE, parseia CSV e
 * faz upsert em pesqele_registry. Atualiza a fila pesqele_missing que o
 * operador revisa em /dashboard para ingerir novos números.
 *
 * Auth: Authorization: Bearer $CRON_SECRET.
 *
 * maxDuration: 300s — o ZIP do TSE pode ter 3-5MB e centenas de linhas CSV.
 */
import { NextRequest, NextResponse } from "next/server";
import { ingestPesqele } from "@/lib/ingest/pesqele";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const secret = process.env.CRON_SECRET ?? process.env.INGEST_SECRET_KEY;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();

  try {
    const result = await ingestPesqele(2026);
    const ok = result.errors.length === 0;

    console.log(
      ok
        ? `[cron/ingest-pesqele] ✅ ${result.upserted}/${result.unique_protocols} upserted, fila missing: ${result.missing_count}`
        : `[cron/ingest-pesqele] ⚠️  erros: ${result.errors.join("; ")}`
    );

    return NextResponse.json({ started_at: startedAt, ...result, ok });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cron/ingest-pesqele] ❌", msg);
    return NextResponse.json({ started_at: startedAt, ok: false, error: msg }, { status: 500 });
  }
}
