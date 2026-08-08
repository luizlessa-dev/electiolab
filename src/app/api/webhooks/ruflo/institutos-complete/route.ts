/**
 * POST /api/webhooks/ruflo/institutos-complete
 *
 * Receives institutos scraping completion from Agent 2
 * Triggers Agent 3 (validação)
 * Updates dashboard with new polls count
 */

import { NextRequest, NextResponse } from "next/server";
import { handleInstitutsCompleteWebhook } from "@/agents/agent-2-institutos";

export async function POST(req: NextRequest) {
  try {
    // TODO: Validate webhook signature

    const body = await req.json();
    console.log("[institutos-complete] webhook received:", body);

    // TODO: Process webhook
    // 1. Validate payload
    // 2. Alert if critical failures (>50% failed)
    // 3. Trigger Agent 3
    // 4. Update dashboard: new polls count, institute status
    // 5. Log to audit

    await handleInstitutsCompleteWebhook(body);

    return NextResponse.json({ ok: true, message: "Institutos webhook processed" });
  } catch (e) {
    console.error("[institutos-complete] error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
