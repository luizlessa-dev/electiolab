/**
 * POST /api/agents/run-agent-2
 *
 * Trigger Agent 2 (Institutos Scraping). Called by Agent 1's webhook
 * (tse-complete) on completion, or manually with the same auth as
 * run-agent-1 (see that file for the curl example).
 *
 * Responds immediately once triggered — the agent itself (and the
 * handoff to Agent 3) runs in the background via after().
 */

import { NextRequest, NextResponse, after } from "next/server";
import { InstitutusScrapeAgent } from "@/agents/agent-2-institutos";

// Covers InstitutusScrapeAgent's own config.timeout_ms (600000ms) + handoff buffer.
export const maxDuration = 620;

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
      console.log("[run-agent-2] Starting Agent 2 (institutos scraping)...");

      const agent = new InstitutusScrapeAgent(5); // parallelism=5
      const result = await agent.run();

      console.log("[run-agent-2] Agent 2 completed:", {
        ok: result.ok,
        completed_count: result.completed_count,
        failed_count: result.failed_count,
        total_polls_inserted: result.total_polls_inserted,
      });

      // Advance with partial success: real scraping rarely gets 100% of
      // institutes on a given run, and validating what did come in beats
      // never advancing the pipeline at all.
      if (result.completed_count > 0) {
        try {
          const webhookResponse = await fetch(`${origin}/api/webhooks/ruflo/institutos-complete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${secret}`,
            },
            body: JSON.stringify(result),
          });
          if (!webhookResponse.ok) {
            console.warn("[run-agent-2] institutos-complete webhook failed:", webhookResponse.status);
          }
        } catch (e) {
          console.warn("[run-agent-2] institutos-complete webhook error:", e);
        }
      } else {
        console.warn("[run-agent-2] no institutes succeeded, not advancing to Agent 3");
      }
    } catch (e) {
      console.error("[run-agent-2] background error:", e);
    }
  });

  return NextResponse.json({
    ok: true,
    message: "Agent 2 triggered — running in background",
  });
}
