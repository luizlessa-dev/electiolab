/**
 * POST /api/webhooks/ruflo/tse-complete
 *
 * Receives TSE ingestão completion from Agent 1
 * Triggers Agent 2 (institutos scraping)
 * Updates dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { handleTseIngestWebhook } from "@/agents/agent-1-tse";

export async function POST(req: NextRequest) {
  try {
    // TODO: Validate webhook signature
    // const signature = req.headers.get("x-ruflo-signature");
    // if (!validateSignature(signature, body)) return 401

    const body = await req.json();
    console.log("[tse-complete] webhook received:", body);

    // TODO: Process webhook
    // 1. Validate payload
    // 2. Trigger Agent 2
    // 3. Update dashboard widget
    // 4. Log to audit

    await handleTseIngestWebhook(body);

    return NextResponse.json({ ok: true, message: "TSE webhook processed" });
  } catch (e) {
    console.error("[tse-complete] error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
