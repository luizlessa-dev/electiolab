/**
 * POST /api/agents/run-agent-1
 *
 * Manually trigger Agent 1 (TSE Ingestão)
 */

import { NextRequest, NextResponse } from "next/server";
import { TseIngestAgent } from "@/agents/agent-1-tse";

// Matches TseIngestAgent's own config.timeout_ms (300000ms).
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    console.log("[run-agent-1] Starting Agent 1 (TSE ingestão)...");

    const agent = new TseIngestAgent();
    const result = await agent.run();

    console.log("[run-agent-1] Agent 1 completed:", {
      ok: result.ok,
      row_count: result.row_count,
      upserted_count: result.upserted_count,
      duration_ms: result.duration_ms,
    });

    // No timeout imposed here: the downstream chain (Agent 2 + Agent 3) can
    // take several minutes, so a short-timeout retry wrapper isn't appropriate.
    if (result.ok) {
      try {
        const webhookResponse = await fetch(`${req.nextUrl.origin}/api/webhooks/ruflo/tse-complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        });
        if (!webhookResponse.ok) {
          console.warn("[run-agent-1] tse-complete webhook failed:", webhookResponse.status);
        }
      } catch (e) {
        console.warn("[run-agent-1] tse-complete webhook error:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Agent 1 executed",
      result,
    });
  } catch (e) {
    console.error("[run-agent-1] error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
