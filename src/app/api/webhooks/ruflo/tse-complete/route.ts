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

    // Trigger Agent 2 (institutos scraping). No timeout imposed here: Agent 2
    // itself runs for up to 10min (config.timeout_ms), so a short-timeout
    // retry wrapper would falsely report failure mid-run.
    if (body.ok) {
      console.log("[tse-complete] Triggering Agent 2...");
      try {
        const agent2Response = await fetch(`${req.nextUrl.origin}/api/agents/run-agent-2`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggered_by: "tse-complete" }),
        });

        if (!agent2Response.ok) {
          console.warn("[tse-complete] Agent 2 trigger failed:", agent2Response.status);
        } else {
          console.log("[tse-complete] Agent 2 triggered successfully");
        }
      } catch (e) {
        console.warn("[tse-complete] Agent 2 trigger error:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "TSE webhook processed, Agent 2 triggered",
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
