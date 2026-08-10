/**
 * POST /api/webhooks/ruflo/tse-complete
 *
 * Receives TSE ingestão completion from Agent 1.
 * For now: just logs and acknowledges.
 * Later: will trigger Agent 2 (institutos scraping)
 */

import { NextRequest, NextResponse } from "next/server";
import { handleTseIngestWebhook } from "@/agents/agent-1-tse";

export async function POST(req: NextRequest) {
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

    // TODO: Trigger Agent 2 here (agent-2-institutos)
    // TODO: Update dashboard widget
    // TODO: Log to data_source_audit (if not already done by Agent 1)

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
