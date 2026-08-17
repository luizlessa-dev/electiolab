/**
 * POST /api/webhooks/ruflo/tse-complete
 *
 * Receives TSE ingestão completion from Agent 1's background task.
 * Internal hop — same CRON_SECRET auth as run-agent-1/2/3.
 *
 * Não dispara mais o Agente 2: aposentado do fluxo automático em
 * 2026-08-17 (0/4 institutos scrapáveis contra os sites reais — ver
 * docs/ELECTIOLAB-AUDIT-2026-08.md, achado C1/achado 4). Descoberta de
 * pesquisa hoje depende de pesqele_registry (TSE) + curadoria manual,
 * ver docs/prompt-verificacao-cobertura-pesqele-tse.md.
 */

import { NextRequest, NextResponse } from "next/server";
import { handleTseIngestWebhook } from "@/agents/agent-1-tse";

function isAuthorized(req: NextRequest): boolean {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && token === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    console.log("[tse-complete] webhook received:", {
      ok: body.ok,
      row_count: body.row_count,
      upserted_count: body.upserted_count,
      duration_ms: body.duration_ms,
      timestamp: body.timestamp,
    });

    // Process the webhook
    await handleTseIngestWebhook(body);

    return NextResponse.json({
      ok: true,
      message: "TSE webhook processed",
      received_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[tse-complete] error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
