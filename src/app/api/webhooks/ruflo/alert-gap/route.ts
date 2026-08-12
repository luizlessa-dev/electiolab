/**
 * POST /api/webhooks/ruflo/alert-gap
 *
 * Receives alerts from Agent 3 (gaps, anomalies).
 * For now: just logs and acknowledges.
 * Later: send email to operador
 */

import { NextRequest, NextResponse } from "next/server";
import { handleAlertGapWebhook } from "@/agents/agent-3-validacao";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[alert-gap] webhook received:", {
      election_id: body.election_id,
      alert_type: body.alert_type,
      severity: body.severity,
      message: body.message,
      timestamp: body.timestamp,
    });

    await handleAlertGapWebhook(body);

    return NextResponse.json({
      ok: true,
      message: "Alert webhook processed",
      received_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[alert-gap] error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
