import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://electiolab.com";

/**
 * GET /api/newsletter/confirm?token=<32-hex>
 *
 * Confirma double opt-in da newsletter:
 *   - Valida token, marca confirmed_at + is_active=true
 *   - Envia pra Beehiiv (se configurado)
 *   - Redireciona pra /newsletter/confirmar?status=success
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.redirect(`${SITE_URL}/newsletter/confirmar?status=invalid`);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: sub, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, confirmed_at, source")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (error || !sub) {
    return NextResponse.redirect(`${SITE_URL}/newsletter/confirmar?status=invalid`);
  }

  // Já confirmado — idempotente
  if (sub.confirmed_at) {
    return NextResponse.redirect(`${SITE_URL}/newsletter/confirmar?status=already`);
  }

  // Ativa
  await supabase
    .from("newsletter_subscribers")
    .update({
      confirmed_at: new Date().toISOString(),
      is_active: true,
      confirmation_token: null, // invalida token (single-use)
    })
    .eq("id", sub.id);

  // Envia pra Beehiiv (best-effort, não bloqueia confirmação)
  if (BEEHIIV_API_KEY && BEEHIIV_PUBLICATION_ID) {
    fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({
          email: sub.email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: sub.source ?? "site",
          utm_medium: "double-optin",
          utm_campaign: "signup",
          referring_site: "electiolab.com",
        }),
      }
    )
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          console.error("[newsletter/confirm] Beehiiv error:", r.status, body);
        } else {
          const body = await r.json();
          await supabase
            .from("newsletter_subscribers")
            .update({ beehiiv_id: body?.data?.id ?? null })
            .eq("id", sub.id);
        }
      })
      .catch((e) => console.error("[newsletter/confirm] Beehiiv fetch failed:", e));
  }

  return NextResponse.redirect(`${SITE_URL}/newsletter/confirmar?status=success`);
}
