/**
 * POST /api/webhooks/ruflo/tse-complete
 *
 * Receives TSE ingestão completion from Agent 1's background task and
 * triggers Agent 2 (institutos scraping). Internal hop — same
 * CRON_SECRET auth as run-agent-1/2/3.
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

    // Trigger Agent 2 (institutos scraping). run-agent-2 acks immediately
    // and does the actual scraping in the background, so this stays a
    // fast round trip regardless of how long Agent 2 itself takes.
    if (body.ok) {
      console.log("[tse-complete] Triggering Agent 2...");
      try {
        const agent2Response = await fetch(`${req.nextUrl.origin}/api/agents/run-agent-2`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.get("authorization") ?? "",
          },
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
