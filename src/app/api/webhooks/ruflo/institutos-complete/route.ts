/**
 * POST /api/webhooks/ruflo/institutos-complete
 *
 * Receives institutos scraping completion from Agent 2's background
 * task and triggers Agent 3 (validação). Internal hop — same
 * CRON_SECRET auth as run-agent-1/2/3.
 */

import { NextRequest, NextResponse } from "next/server";
import { handleInstitutsCompleteWebhook } from "@/agents/agent-2-institutos";

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

    console.log("[institutos-complete] webhook received:", {
      ok: body.ok,
      completed_count: body.completed_count,
      failed_count: body.failed_count,
      total_polls_inserted: body.total_polls_inserted,
      timestamp: body.timestamp,
    });

    await handleInstitutsCompleteWebhook(body);

    // Trigger Agent 3 with partial success: real scraping rarely gets
    // every institute in a single run (see run-agent-2 for the same gate).
    if (body.completed_count > 0) {
      console.log("[institutos-complete] Triggering Agent 3...");
      try {
        const agent3Response = await fetch(`${req.nextUrl.origin}/api/agents/run-agent-3`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.get("authorization") ?? "",
          },
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
    } else {
      console.warn("[institutos-complete] no institutes succeeded, not advancing to Agent 3");
    }

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
