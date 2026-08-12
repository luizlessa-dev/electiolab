/**
 * POST /api/agents/run-agent-3
 *
 * Manually trigger Agent 3 (Validação + Alertas)
 * Called by Agent 2 webhook on completion
 */

import { NextResponse } from "next/server";
import { ValidacaoAgent } from "@/agents/agent-3-validacao";

export async function POST() {
  try {
    console.log("[run-agent-3] Starting Agent 3 (validação + alertas)...");

    const agent = new ValidacaoAgent();
    const result = await agent.run();

    console.log("[run-agent-3] Agent 3 completed:", {
      ok: result.ok,
      elections_checked: result.elections_checked,
      alerts_count: result.alerts_count,
      status: result.status,
    });

    return NextResponse.json({
      ok: true,
      message: "Agent 3 executed",
      result,
    });
  } catch (e) {
    console.error("[run-agent-3] error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
