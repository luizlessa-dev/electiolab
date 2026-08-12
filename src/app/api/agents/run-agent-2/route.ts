/**
 * POST /api/agents/run-agent-2
 *
 * Manually trigger Agent 2 (Institutos Scraping)
 * Called by Agent 1 webhook on completion
 */

import { NextResponse } from "next/server";
import { InstitutusScrapeAgent } from "@/agents/agent-2-institutos";

export async function POST() {
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

    // TODO: Trigger Agent 3 webhook after Agent 2 completes
    // if (result.ok) {
    //   await fetch("http://localhost:3001/api/webhooks/ruflo/institutos-complete", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(result),
    //   });
    // }

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
