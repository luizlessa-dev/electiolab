/**
 * POST /api/agents/run-agent-1
 *
 * Manually trigger Agent 1 (TSE Ingestão)
 */

import { NextRequest, NextResponse } from "next/server";
import { TseIngestAgent } from "@/agents/agent-1-tse";

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
