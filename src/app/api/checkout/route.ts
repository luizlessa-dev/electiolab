import { getStripe, PLANS } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/checkout
 * Body: { tier: "pro" | "business", interval?: "monthly" | "yearly" }
 *
 * Creates a Stripe Checkout Session and returns the URL.
 * Requires the user to be authenticated (Supabase session).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let tier: "pro" | "business";
  let interval: "monthly" | "yearly" = "monthly";
  try {
    const body = await request.json();
    tier = body.tier;
    if (body.interval === "yearly") interval = "yearly";
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!tier || !["pro", "business"].includes(tier)) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }

  const plan = PLANS[tier];
  const priceId =
    tier === "pro" && interval === "yearly" && "stripePriceYearly" in plan
      ? plan.stripePriceYearly
      : plan.stripePriceMonthly;

  if (!priceId) {
    return NextResponse.json(
      { error: "Preço Stripe não configurado. Adicione STRIPE_PRICE_* nas variáveis de ambiente." },
      { status: 500 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://electiolab.com";

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    metadata: {
      user_id: user.id,
      tier,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        tier,
      },
    },
    success_url: `${siteUrl}/dashboard?checkout=success`,
    cancel_url: `${siteUrl}/precos?checkout=cancelled`,
    locale: "pt-BR",
  });

  return NextResponse.json({ url: session.url });
}
