/**
 * Endpoint chamado pelo cron job para disparar alertas de quota
 *
 * Chamada: GET /api/admin/send-quota-alerts?token=CRON_JOB_TOKEN
 *
 * Segurança: Requer CRON_JOB_TOKEN válido (env var)
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sendQuotaAlerts } from "@/lib/notifications/send-quota-alerts";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const cronToken = process.env.CRON_JOB_TOKEN;

  // Validar token
  if (!cronToken || token !== cronToken) {
    return NextResponse.json(
      { error: "Unauthorized: invalid token" },
      { status: 401 }
    );
  }

  try {
    console.log("[quota-alerts] Starting quota alert run at", new Date().toISOString());

    const result = await sendQuotaAlerts(supabaseAdmin, resend);

    return NextResponse.json(
      {
        success: true,
        message: `Sent ${result.sentEmails}/${result.totalAlerts} quota alerts`,
        summary: result,
      },
      { status: 200 }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[quota-alerts] Error:", errorMsg);

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
