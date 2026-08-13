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

    // Trigger Agent 3 (validação + alertas)
    if (body.ok) {
      console.log("[institutos-complete] Triggering Agent 3...");
      try {
        const agent3Response = await fetch(`${req.nextUrl.origin}/api/agents/run-agent-3`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggered_by: "institutos-complete" }),
        });

        if (!agent3Response.ok) {
          console.warn("[institutos-complete] Agent 3 trigger failed:", agent3Response.status);
        } else {
          console.log("[institutos-complete] Agent 3 triggered successfully");
        }
      } catch (e) {
        console.warn("[institutos-complete] Agent 3 trigger error:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Institutos webhook processed, Agent 3 triggered",
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
