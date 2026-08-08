/**
 * POST /api/webhooks/ruflo/alert-gap
 *
 * Receives alerts from Agent 3 (gaps, anomalies)
 * Sends email to operador via Resend
 * Updates dashboard with alert banner
 */

import { NextRequest, NextResponse } from "next/server";
import { handleAlertGapWebhook } from "@/agents/agent-3-validacao";

export async function POST(req: NextRequest) {
  try {
    // TODO: Validate webhook signature

    const body = await req.json();
    console.log("[alert-gap] webhook received:", body);

    // TODO: Process webhook
    // 1. Validate payload
    // 2. Determine severity
    // 3. Send email to operador@electiolab.com (via Resend)
    // 4. Insert into operador_alerts table
    // 5. Update dashboard: red banner alert
    // 6. (Future) Send Slack notification
    // 7. Log to audit

    await handleAlertGapWebhook(body);

    return NextResponse.json({ ok: true, message: "Alert webhook processed" });
  } catch (e) {
    console.error("[alert-gap] error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
