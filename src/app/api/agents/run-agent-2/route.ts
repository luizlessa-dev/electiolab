/**
 * POST /api/agents/run-agent-2
 *
 * Manually trigger Agent 2 (Institutos Scraping)
 * Called by Agent 1 webhook on completion
 */

import { NextRequest, NextResponse } from "next/server";
import { InstitutusScrapeAgent } from "@/agents/agent-2-institutos";

// Matches InstitutusScrapeAgent's own config.timeout_ms (600000ms).
export const maxDuration = 600;

export async function POST(req: NextRequest) {
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

    // No timeout imposed here: Agent 3 runs after this, so a short-timeout
    // retry wrapper isn't appropriate (see run-agent-1 for the same reasoning).
    if (result.ok) {
      try {
        const webhookResponse = await fetch(`${req.nextUrl.origin}/api/webhooks/ruflo/institutos-complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        });
        if (!webhookResponse.ok) {
          console.warn("[run-agent-2] institutos-complete webhook failed:", webhookResponse.status);
        }
      } catch (e) {
        console.warn("[run-agent-2] institutos-complete webhook error:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Agent 2 executed",
      result,
    });
  } catch (e) {
    console.error("[run-agent-2] error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
