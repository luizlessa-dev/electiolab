import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://electiolab.com";

/**
 * GET /api/newsletter/unsubscribe?id=<uuid>
 * Marca o subscriber como inativo (LGPD: revogação de consentimento).
 * Idempotente. Redireciona pra /newsletter/cancelado.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id || !/^[a-f0-9-]{36}$/.test(id)) {
    return NextResponse.redirect(`${SITE_URL}/newsletter/cancelado?status=invalid`);
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await sb
    .from("newsletter_subscribers")
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[unsubscribe] error:", error.message);
    return NextResponse.redirect(`${SITE_URL}/newsletter/cancelado?status=error`);
  }

  return NextResponse.redirect(`${SITE_URL}/newsletter/cancelado?status=success`);
}
