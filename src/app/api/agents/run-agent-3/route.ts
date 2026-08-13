/**
 * POST /api/agents/run-agent-3
 *
 * Trigger Agent 3 (Validação + Alertas). Called by Agent 2's webhook
 * (institutos-complete) on completion, or manually with the same auth
 * as run-agent-1 (see that file for the curl example).
 *
 * Responds immediately once triggered — the agent itself (and the
 * alert-gap notifications) runs in the background via after(). This
 * is the terminal step of the pipeline: nothing runs after it.
 */

import { NextRequest, NextResponse, after } from "next/server";
import { ValidacaoAgent } from "@/agents/agent-3-validacao";

// Covers ValidacaoAgent's own config.timeout_ms (60000ms) + handoff buffer.
export const maxDuration = 75;

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
      console.log("[run-agent-3] Starting Agent 3 (validação + alertas)...");

      const agent = new ValidacaoAgent();
      const result = await agent.run();

      console.log("[run-agent-3] Agent 3 completed:", {
        ok: result.ok,
        elections_checked: result.elections_checked,
        alerts_count: result.alerts_count,
        status: result.status,
      });

      if (result.alerts_count > 0 && result.alerts) {
        for (const alert of result.alerts) {
          try {
            const alertResponse = await fetch(`${origin}/api/webhooks/ruflo/alert-gap`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${secret}`,
              },
              body: JSON.stringify(alert),
            });
            if (!alertResponse.ok) {
              console.warn("[run-agent-3] alert-gap webhook failed:", alertResponse.status);
            }
          } catch (e) {
            console.warn("[run-agent-3] alert-gap webhook error:", e);
          }
        }
      }
    } catch (e) {
      console.error("[run-agent-3] background error:", e);
    }
  });

  return NextResponse.json({
    ok: true,
    message: "Agent 3 triggered — running in background",
  });
}
