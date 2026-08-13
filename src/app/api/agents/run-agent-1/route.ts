/**
 * POST /api/agents/run-agent-1
 *
 * Trigger Agent 1 (TSE Ingestão). Vercel Cron injects
 * Authorization: Bearer $CRON_SECRET automatically; for manual runs:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://electiolab.vercel.app/api/agents/run-agent-1
 *
 * Responds immediately once triggered — the agent itself (and the
 * handoff to Agent 2) runs in the background via after(), so this
 * request doesn't need to stay open for the agent's full duration.
 * Check `agent_runs` (or /api/health/agent-1-tse) for the result.
 */

import { NextRequest, NextResponse, after } from "next/server";
import { TseIngestAgent } from "@/agents/agent-1-tse";

// Covers TseIngestAgent's own config.timeout_ms (300000ms) + handoff buffer.
export const maxDuration = 320;

function isAuthorized(req: NextRequest): boolean {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && token === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = req.nextUrl.origin;
  const secret = process.env.CRON_SECRET!;

  after(async () => {
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

      if (result.ok) {
        try {
          const webhookResponse = await fetch(`${origin}/api/webhooks/ruflo/tse-complete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${secret}`,
            },
            body: JSON.stringify(result),
          });
          if (!webhookResponse.ok) {
            console.warn("[run-agent-1] tse-complete webhook failed:", webhookResponse.status);
          }
        } catch (e) {
          console.warn("[run-agent-1] tse-complete webhook error:", e);
        }
      }
    } catch (e) {
      console.error("[run-agent-1] background error:", e);
    }
  });

  return NextResponse.json({
    ok: true,
    message: "Agent 1 triggered — running in background",
  });
}
