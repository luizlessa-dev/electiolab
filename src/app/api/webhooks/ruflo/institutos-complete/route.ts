/**
 * POST /api/webhooks/ruflo/institutos-complete
 *
 * Receives institutos scraping completion from Agent 2
 * Triggers Agent 3 (validação)
 * Updates dashboard with new polls count
 */

import { NextRequest, NextResponse } from "next/server";
import { handleInstitutsCompleteWebhook } from "@/agents/agent-2-institutos";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[institutos-complete] webhook received:", {
      ok: body.ok,
      completed_count: body.completed_count,
      failed_count: body.failed_count,
      total_polls_inserted: body.total_polls_inserted,
      timestamp: body.timestamp,
    });

    await handleInstitutsCompleteWebhook(body);

    return NextResponse.json({
      ok: true,
      message: "Institutos webhook processed",
      received_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[institutos-complete] error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
